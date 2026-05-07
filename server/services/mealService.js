// =============================================================
// MEAL SERVICE
// Nutrient summation, RDA-weighted distribution, scoring,
// suggestions, and PM-POSHAN benchmarking.
// =============================================================

import pool from '../database/database.js';

// ── Nutrient keys shared across functions ─────────────────────
const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'iron', 'calcium'];

// ── Scoring weights — fallback if DB config missing ──────────
export const SCORE_WEIGHTS_DEFAULT = {
  calories: 0.20,
  protein:  0.20,
  iron:     0.20,
  calcium:  0.20,
  fiber:    0.10,
};

// Loads weights from meal_scoring_config table; falls back to SCORE_WEIGHTS_DEFAULT.
export const loadScoringWeights = async () => {
  try {
    const res = await pool.query(`SELECT nutrient, weight FROM meal_scoring_config`);
    if (res.rows.length === 0) return { ...SCORE_WEIGHTS_DEFAULT };
    const weights = {};
    for (const row of res.rows) {
      weights[row.nutrient] = parseFloat(row.weight);
    }
    // Ensure all default keys present (DB may be partial)
    for (const [k, v] of Object.entries(SCORE_WEIGHTS_DEFAULT)) {
      if (weights[k] === undefined) weights[k] = v;
    }
    return weights;
  } catch {
    return { ...SCORE_WEIGHTS_DEFAULT };
  }
};

// ── PM-POSHAN targets ─────────────────────────────────────────
const PM_POSHAN = {
  primary:       { calories: 450, protein: 12 },
  upper_primary: { calories: 700, protein: 20 },
};

// =============================================================
// 1. MEAL NUTRIENT TOTALS
// =============================================================
export const calculateMealNutrients = async (meal_id) => {
  const result = await pool.query(
    `SELECT
       COALESCE(SUM(n.calories_per_100g    * mi.quantity_g / 100), 0) AS calories,
       COALESCE(SUM(n.protein_per_100g     * mi.quantity_g / 100), 0) AS protein,
       COALESCE(SUM(n.carbs_per_100g       * mi.quantity_g / 100), 0) AS carbs,
       COALESCE(SUM(n.fat_per_100g         * mi.quantity_g / 100), 0) AS fat,
       COALESCE(SUM(n.fiber_per_100g       * mi.quantity_g / 100), 0) AS fiber,
       COALESCE(SUM(n.iron_mg_per_100g     * mi.quantity_g / 100), 0) AS iron,
       COALESCE(SUM(n.calcium_mg_per_100g  * mi.quantity_g / 100), 0) AS calcium
     FROM meal_ingredients mi
     JOIN ingredient_nutrition n ON mi.ingredient_id = n.ingredient_id
     WHERE mi.meal_id = $1`,
    [meal_id]
  );

  const r = result.rows[0];
  const totals = {};
  for (const n of NUTRIENTS) {
    totals[n] = Math.round(parseFloat(r[n] || 0) * 100) / 100;
  }
  return totals;
};

// =============================================================
// 2. RDA-WEIGHTED DISTRIBUTION  (fully dynamic, per Scientific_Basis)
// share_i = total_nutrient × (rda_cal_i / Σ rda_cal_j)
// Queries each student's real ICMR-NIN calorie RDA by age+gender.
// Groups result by class_group for storage in meal_distributions.
// =============================================================
export const computeDistributionByRda = async (total, school_id) => {
  const studentsRes = await pool.query(
    `SELECT s.id, s.age, s.gender, cg.group_label
     FROM students s
     JOIN class_groups cg ON cg.class_id = s.class_id AND cg.school_id = s.school_id
     WHERE s.school_id = $1`,
    [school_id]
  );
  if (studentsRes.rows.length === 0) throw new Error('No students with class-group assignments found');

  const rdaCache = {};
  const fetchRdaCal = async (age, gender) => {
    const age_group = getAgeGroup(age || 10);
    const g = gender === 'male' ? 'male' : 'female';
    const key = `${age_group}|${g}`;
    if (rdaCache[key] !== undefined) return rdaCache[key];
    const res = await pool.query(
      `SELECT calories_kcal FROM rda_reference WHERE age_group = $1 AND gender = $2 LIMIT 1`,
      [age_group, g]
    );
    rdaCache[key] = res.rows[0] ? parseFloat(res.rows[0].calories_kcal) : 1600;
    return rdaCache[key];
  };

  let totalWeight = 0;
  const studentWeights = [];
  for (const s of studentsRes.rows) {
    const cal = await fetchRdaCal(s.age, (s.gender || '').toLowerCase());
    studentWeights.push({ ...s, rda_cal: cal });
    totalWeight += cal;
  }
  if (totalWeight === 0) throw new Error('Total RDA weight is zero');

  const groupMap = {};
  for (const s of studentWeights) {
    const g = s.group_label || 'UNASSIGNED';
    if (!groupMap[g]) groupMap[g] = { student_count: 0, rda_weight: 0, nutrient_sums: {} };
    groupMap[g].student_count++;
    groupMap[g].rda_weight += s.rda_cal;
    for (const n of NUTRIENTS) {
      groupMap[g].nutrient_sums[n] = (groupMap[g].nutrient_sums[n] || 0)
        + total[n] * (s.rda_cal / totalWeight);
    }
  }

  const result = [];
  for (const [group_label, data] of Object.entries(groupMap)) {
    const entry = { group_label, student_count: data.student_count,
      weighted_load: Math.round((data.rda_weight / totalWeight) * 10000) / 10000 };
    for (const n of NUTRIENTS) {
      const perStudent = data.student_count > 0 ? data.nutrient_sums[n] / data.student_count : 0;
      entry[`${n}_per_student`] = Math.round(perStudent * 100) / 100;
    }
    result.push(entry);
  }
  return result;
};

// Legacy shim — kept so manual /distribute controller still compiles.
export const getStudentCountsByGroup = async (school_id) => {
  const result = await pool.query(
    `SELECT cg.group_label, COUNT(s.id) AS count
     FROM class_groups cg
     LEFT JOIN students s ON s.class_id = cg.class_id AND s.school_id = cg.school_id
     WHERE cg.school_id = $1
     GROUP BY cg.group_label`,
    [school_id]
  );
  const counts = {};
  result.rows.forEach(r => { counts[r.group_label] = parseInt(r.count); });
  return counts;
};

// Legacy shim — deprecated, routes ignored. Direct callers now use computeDistributionByRda.
export const computeDistribution = (_total, _counts) => {
  throw new Error('computeDistribution() deprecated. Use computeDistributionByRda(total, school_id).');
};

// =============================================================
// 4. SAVE DISTRIBUTION
// =============================================================
export const saveDistribution = async (meal_id, distribution) => {
  for (const d of distribution) {
    await pool.query(
      `INSERT INTO meal_distributions (
         meal_id, group_label, student_count, weighted_load,
         calories_per_student, protein_per_student, carbs_per_student,
         fat_per_student, fiber_per_student, iron_per_student, calcium_per_student
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (meal_id, group_label) DO UPDATE SET
         student_count        = EXCLUDED.student_count,
         weighted_load        = EXCLUDED.weighted_load,
         calories_per_student = EXCLUDED.calories_per_student,
         protein_per_student  = EXCLUDED.protein_per_student,
         carbs_per_student    = EXCLUDED.carbs_per_student,
         fat_per_student      = EXCLUDED.fat_per_student,
         fiber_per_student    = EXCLUDED.fiber_per_student,
         iron_per_student     = EXCLUDED.iron_per_student,
         calcium_per_student  = EXCLUDED.calcium_per_student`,
      [
        meal_id, d.group_label, d.student_count, d.weighted_load,
        d.calories_per_student, d.protein_per_student, d.carbs_per_student,
        d.fat_per_student,      d.fiber_per_student,   d.iron_per_student,
        d.calcium_per_student,
      ]
    );
  }
};

// =============================================================
// 5. MEAL SCORING  (per Scientific_Basis.pdf)
// adequacy% = (provided / rda) × 100, capped at 100
// score = Σ weight_i × min(adequacy_i, 100) / Σ weights
// Penalty: −10 if any nutrient < 50% adequacy
// =============================================================
export const scoreMeal = (mealNutrients, rdaTargets, weights = SCORE_WEIGHTS_DEFAULT) => {
  let scoreSum   = 0;
  let weightSum  = 0;
  let hasSevere  = false;
  const breakdown = {};

  for (const [nutrient, weight] of Object.entries(weights)) {
    const provided = mealNutrients[nutrient] || 0;
    const rda      = rdaTargets[nutrient]    || 1;
    const adequacy = Math.min((provided / rda) * 100, 100);

    if (adequacy < 50) hasSevere = true;

    scoreSum  += weight * adequacy;
    weightSum += weight;

    breakdown[nutrient] = {
      provided: Math.round(provided * 100) / 100,
      rda:      Math.round(rda * 100) / 100,
      adequacy: Math.round(adequacy * 10) / 10,
    };
  }

  let score = weightSum > 0 ? scoreSum / weightSum : 0;
  if (hasSevere) score = Math.max(0, score - 10);
  score = Math.round(score * 10) / 10;

  let label;
  if (score >= 90)      label = 'Balanced';
  else if (score >= 70) label = 'Good';
  else if (score >= 50) label = 'Average';
  else                  label = 'Poor';

  return { score, label, breakdown };
};

// =============================================================
// 6. PM-POSHAN BENCHMARKING
// =============================================================
export const checkPmPoshan = (calories, protein) => {
  const results = {};

  for (const [level, targets] of Object.entries(PM_POSHAN)) {
    const calPct  = targets.calories > 0 ? (calories / targets.calories) * 100 : 100;
    const protPct = targets.protein  > 0 ? (protein  / targets.protein)  * 100 : 100;
    const pct     = Math.min(calPct, protPct);

    let status;
    if (pct >= 90)      status = 'meeting_standard';
    else if (pct >= 70) status = 'partial';
    else                status = 'deficient';

    results[level] = {
      target_calories: targets.calories,
      target_protein:  targets.protein,
      provided_calories: Math.round(calories * 10) / 10,
      provided_protein:  Math.round(protein  * 10) / 10,
      calorie_pct:  Math.round(calPct  * 10) / 10,
      protein_pct:  Math.round(protPct * 10) / 10,
      status,
    };
  }

  return results;
};

// =============================================================
// 7. DEFICIENCY-BASED SUGGESTIONS
// =============================================================
export const getSuggestions = async (deficits) => {
  if (!deficits || deficits.length === 0) return [];

  const suggestions = [];

  for (const nutrient of deficits) {
    const rows = await pool.query(
      `SELECT suggestion, category FROM nutrition_suggestions
       WHERE nutrient = $1
       ORDER BY priority ASC
       LIMIT 3`,
      [nutrient]
    );
    rows.rows.forEach(r => {
      suggestions.push({ nutrient, suggestion: r.suggestion, category: r.category });
    });
  }

  // Deduplicate by suggestion text
  const seen = new Set();
  return suggestions.filter(s => {
    if (seen.has(s.suggestion)) return false;
    seen.add(s.suggestion);
    return true;
  });
};

// =============================================================
// 8. WEIGHTED RDA BASELINE FROM REAL STUDENT MIX
// Queries actual student age+gender from school, maps to
// rda_reference (ICMR-NIN 2020), returns weighted average RDA.
// =============================================================
import { getAgeGroup } from '../database/seedRDA.js';

export const computeSchoolRdaBaseline = async (school_id) => {
  // Pull all students with age + gender
  const studentsRes = await pool.query(
    `SELECT s.age, s.gender
     FROM students s
     WHERE s.school_id = $1`,
    [school_id]
  );

  if (studentsRes.rows.length === 0) {
    // Fallback: blended average if no students yet
    return { calories: 1600, protein: 35, carbs: 220, fat: 40, fiber: 20, iron: 12, calcium: 900 };
  }

  // Fetch unique (age_group, gender) RDA rows once
  const rdaCache = {};
  const fetchRda = async (age_group, gender) => {
    const key = `${age_group}|${gender}`;
    if (rdaCache[key]) return rdaCache[key];
    const res = await pool.query(
      `SELECT calories_kcal, protein_g, carbs_g, fat_g, fiber_g, iron_mg, calcium_mg
       FROM rda_reference WHERE age_group = $1 AND gender = $2 LIMIT 1`,
      [age_group, gender]
    );
    rdaCache[key] = res.rows[0] || null;
    return rdaCache[key];
  };

  // Accumulate sum then average
  const sums = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, iron: 0, calcium: 0 };
  let count = 0;

  for (const s of studentsRes.rows) {
    const age_group = getAgeGroup(s.age || 10);
    const gender    = (s.gender || '').toLowerCase() === 'male' ? 'male' : 'female';
    const rda = await fetchRda(age_group, gender);
    if (!rda) continue;
    sums.calories += parseFloat(rda.calories_kcal);
    sums.protein  += parseFloat(rda.protein_g);
    sums.carbs    += parseFloat(rda.carbs_g);
    sums.fat      += parseFloat(rda.fat_g);
    sums.fiber    += parseFloat(rda.fiber_g);
    sums.iron     += parseFloat(rda.iron_mg);
    sums.calcium  += parseFloat(rda.calcium_mg);
    count++;
  }

  if (count === 0) {
    return { calories: 1600, protein: 35, carbs: 220, fat: 40, fiber: 20, iron: 12, calcium: 900 };
  }

  return {
    calories: Math.round(sums.calories / count),
    protein:  Math.round(sums.protein  / count * 10) / 10,
    carbs:    Math.round(sums.carbs    / count),
    fat:      Math.round(sums.fat      / count),
    fiber:    Math.round(sums.fiber    / count * 10) / 10,
    iron:     Math.round(sums.iron     / count * 10) / 10,
    calcium:  Math.round(sums.calcium  / count),
  };
};

// =============================================================
// 9. MEAL QUALITY EXPLANATION  (human-readable sentences)
// Generates plain-English explanation per nutrient + PM-POSHAN.
// =============================================================
const NUTRIENT_LABELS = {
  calories: 'Energy (calories)',
  protein:  'Protein',
  carbs:    'Carbohydrates',
  fat:      'Fat',
  fiber:    'Dietary fibre',
  iron:     'Iron',
  calcium:  'Calcium',
};

const PM_POSHAN_NUTRIENT_TARGETS = {
  primary:       { calories: 450, protein: 12 },
  upper_primary: { calories: 700, protein: 20 },
};

export const generateMealExplanation = (perStudent, rdaForMeal, scoringBreakdown, pmPoshan) => {
  const lines = [];

  // Per-nutrient explanation
  for (const [nutrient, data] of Object.entries(scoringBreakdown)) {
    const label    = NUTRIENT_LABELS[nutrient] || nutrient;
    const adequacy = data.adequacy;
    const provided = data.provided;
    const rda      = data.rda;

    if (adequacy >= 100) {
      lines.push(`✅ ${label}: Meets the RDA target (${provided} provided vs ${rda} required).`);
    } else if (adequacy >= 75) {
      lines.push(`🟡 ${label}: Slightly below target — ${provided} provided, ${rda} required (${adequacy}% met). Consider minor additions.`);
    } else if (adequacy >= 50) {
      lines.push(`🟠 ${label}: Moderately insufficient — only ${adequacy}% of the RDA is met. ${provided} provided vs ${rda} required.`);
    } else {
      lines.push(`🔴 ${label}: Severely insufficient — only ${adequacy}% of the RDA is met (${provided} provided, ${rda} required). Immediate improvement needed.`);
    }
  }

  // PM-POSHAN explanation
  lines.push('');
  lines.push('📋 PM-POSHAN Benchmark:');

  for (const [level, result] of Object.entries(pmPoshan)) {
    const levelLabel = level === 'primary' ? 'Primary (Grades 1–5)' : 'Upper Primary (Grades 6–8)';
    const targets    = PM_POSHAN_NUTRIENT_TARGETS[level];

    if (result.status === 'meeting_standard') {
      lines.push(`  ✅ ${levelLabel}: Meal meets PM-POSHAN standard (≥90% of ${targets.calories} kcal / ${targets.protein}g protein).`);
    } else if (result.status === 'partial') {
      lines.push(`  🟡 ${levelLabel}: Meal partially meets PM-POSHAN standard. Calories at ${result.calorie_pct}% and protein at ${result.protein_pct}% of the ${targets.calories} kcal / ${targets.protein}g target.`);
    } else {
      lines.push(`  🔴 ${levelLabel}: Meal falls below PM-POSHAN expectation. Only ${result.calorie_pct}% of energy and ${result.protein_pct}% of protein requirement met (target: ${targets.calories} kcal / ${targets.protein}g protein).`);
    }
  }

  // Iron-specific PM-POSHAN note (iron is often the most deficient)
  if (scoringBreakdown.iron && scoringBreakdown.iron.adequacy < 75) {
    lines.push(`  ⚠️  Iron contribution is below PM-POSHAN expectation — iron-rich ingredients like palak, masoor dal, or jaggery are recommended.`);
  }

  return lines.join('\n');
};

// =============================================================
// 10. FULL MEAL SUMMARY (totals + auto-distribution + score +
//     PM-POSHAN + deficits + human explanation)
// RDA baseline derived from real school student age/gender mix.
// Distribution auto-runs if class groups exist.
// =============================================================
export const computeMealSummary = async (meal_id) => {
  const totals = await calculateMealNutrients(meal_id);

  const mealRow = await pool.query(`SELECT school_id FROM meals WHERE id = $1`, [meal_id]);
  if (mealRow.rows.length === 0) throw new Error('Meal not found');
  const school_id = mealRow.rows[0].school_id;

  // ── Auto-distribute using real per-student RDA weights ────
  let distribution = [];
  let studentCount = 1;
  try {
    const groupCheck = await pool.query(
      `SELECT COUNT(*) FROM class_groups WHERE school_id = $1`, [school_id]
    );
    if (parseInt(groupCheck.rows[0].count) > 0) {
      distribution = await computeDistributionByRda(totals, school_id);
      await saveDistribution(meal_id, distribution);
      studentCount = distribution.reduce((sum, g) => sum + g.student_count, 0) || 1;
    } else {
      const countRes = await pool.query(
        `SELECT COUNT(s.id) AS total FROM students s WHERE s.school_id = $1`, [school_id]
      );
      studentCount = parseInt(countRes.rows[0].total) || 1;
    }
  } catch (distErr) {
    console.warn('Auto-distribution warning in summary:', distErr.message);
    const countRes = await pool.query(
      `SELECT COUNT(s.id) AS total FROM students s WHERE s.school_id = $1`, [school_id]
    );
    studentCount = parseInt(countRes.rows[0].total) || 1;
  }

  // ── Per-student: RDA-weighted average across groups ────────
  // If distribution ran: weighted avg per student = Σ(group_share) / total_students
  // This is scientifically consistent with the distribution model.
  const perStudent = {};
  if (distribution.length > 0) {
    for (const n of NUTRIENTS) {
      const totalDistributed = distribution.reduce(
        (sum, g) => sum + (g[`${n}_per_student`] || 0) * g.student_count, 0
      );
      perStudent[n] = Math.round((totalDistributed / studentCount) * 100) / 100;
    }
  } else {
    // Fallback: simple equal split when no distribution data
    for (const n of NUTRIENTS) {
      perStudent[n] = Math.round((totals[n] / studentCount) * 100) / 100;
    }
  }

  // ── Real RDA baseline from student mix (Issue 1 fix) ──────
  const LUNCH_FRACTION = 0.40;
  const rdaBaseline    = await computeSchoolRdaBaseline(school_id);
  const rdaForMeal     = {};
  for (const n of NUTRIENTS) rdaForMeal[n] = Math.round(rdaBaseline[n] * LUNCH_FRACTION * 100) / 100;

  // ── Load scoring weights from DB (falls back to defaults) ─
  const scoringWeights = await loadScoringWeights();

  const scoring  = scoreMeal(perStudent, rdaForMeal, scoringWeights);
  const pmPoshan = checkPmPoshan(perStudent.calories, perStudent.protein);

  // Deficient nutrients (< 75% adequacy)
  const deficits = Object.entries(scoring.breakdown)
    .filter(([, v]) => v.adequacy < 75)
    .map(([n]) => n);

  const suggestions = await getSuggestions(deficits);

  // ── Human-readable explanation (Issue 3 fix) ───────────────
  const explanation = generateMealExplanation(perStudent, rdaForMeal, scoring.breakdown, pmPoshan);

  // Upsert summary
  await pool.query(
    `INSERT INTO meal_nutrition_summary (
       meal_id, total_calories, total_protein, total_carbs,
       total_fat, total_fiber, total_iron, total_calcium,
       score, score_label, pm_poshan_status, computed_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
     ON CONFLICT (meal_id) DO UPDATE SET
       total_calories   = EXCLUDED.total_calories,
       total_protein    = EXCLUDED.total_protein,
       total_carbs      = EXCLUDED.total_carbs,
       total_fat        = EXCLUDED.total_fat,
       total_fiber      = EXCLUDED.total_fiber,
       total_iron       = EXCLUDED.total_iron,
       total_calcium    = EXCLUDED.total_calcium,
       score            = EXCLUDED.score,
       score_label      = EXCLUDED.score_label,
       pm_poshan_status = EXCLUDED.pm_poshan_status,
       computed_at      = NOW()`,
    [
      meal_id,
      totals.calories, totals.protein, totals.carbs,
      totals.fat, totals.fiber, totals.iron, totals.calcium,
      scoring.score, scoring.label,
      pmPoshan.primary.status,
    ]
  );

  return {
    meal_id,
    student_count:      studentCount,
    rda_baseline:       rdaBaseline,
    rda_for_meal:       rdaForMeal,
    total_nutrients:    totals,
    per_student:        perStudent,
    score:              scoring.score,
    score_label:        scoring.label,
    nutrient_breakdown: scoring.breakdown,
    pm_poshan:          pmPoshan,
    deficiencies:       deficits,
    suggestions,
    explanation,
  };
};