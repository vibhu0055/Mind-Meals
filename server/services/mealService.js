// =============================================================
// MEAL SERVICE
// Nutrient summation, RDA-weighted distribution, scoring,
// suggestions, and PM-POSHAN benchmarking.
// =============================================================

import pool from '../database/database.js';
import { getAgeGroup } from '../database/seedRDA.js';

const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'iron', 'calcium'];

// ── Scoring weights — fallback if DB config missing ──────────
export const SCORE_WEIGHTS_DEFAULT = {
  calories: 0.20,
  protein:  0.20,
  iron:     0.20,
  calcium:  0.20,
  fiber:    0.10,
};

export const loadScoringWeights = async () => {
  try {
    const res = await pool.query(`SELECT nutrient, weight FROM meal_scoring_config`);
    if (res.rows.length === 0) return { ...SCORE_WEIGHTS_DEFAULT };
    const weights = {};
    for (const row of res.rows) weights[row.nutrient] = parseFloat(row.weight);
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
  for (const n of NUTRIENTS) totals[n] = Math.round(parseFloat(r[n] || 0) * 100) / 100;
  return totals;
};

// =============================================================
// 2. RDA-WEIGHTED DISTRIBUTION  (no groups — school-wide)
//
// Queries every student's real ICMR-NIN calorie RDA by age+gender.
// total_rda_weight = Σ rda_cal for all students (saved as snapshot).
// per_student_n   = total_meal_n / total_students  (simple average
//                   for scoring/PM-POSHAN display).
// Individual student reports use total_rda_weight directly.
// =============================================================
export const computeDistributionByRda = async (total, school_id) => {
  // Fetch students with their class level for PM-POSHAN split
  const studentsRes = await pool.query(
    `SELECT s.id, s.age, s.gender, c.level AS class_level
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.school_id = $1`,
    [school_id]
  );
  if (studentsRes.rows.length === 0)
    throw new Error('No students found for this school');

  const rdaCache = {};
  const fetchRdaCal = async (age, gender) => {
    const age_group = getAgeGroup(age || 10);
    const g = (gender || '').toLowerCase() === 'female' ? 'female' : 'male';
    const key = `${age_group}|${g}`;
    if (rdaCache[key] !== undefined) return rdaCache[key];
    const res = await pool.query(
      `SELECT calories_kcal FROM rda_reference WHERE age_group = $1 AND gender = $2 LIMIT 1`,
      [age_group, g]
    );
    rdaCache[key] = res.rows[0] ? parseFloat(res.rows[0].calories_kcal) : 1600;
    return rdaCache[key];
  };

  let totalRdaWeight = 0;
  let primaryRdaWeight = 0;
  let upperRdaWeight = 0;
  let primaryCount = 0;
  let upperCount = 0;

  for (const s of studentsRes.rows) {
    const cal = await fetchRdaCal(s.age, s.gender);
    totalRdaWeight += cal;
    if (s.class_level === 'primary') {
      primaryRdaWeight += cal;
      primaryCount++;
    } else if (s.class_level === 'upper_primary') {
      upperRdaWeight += cal;
      upperCount++;
    }
  }
  if (totalRdaWeight === 0) throw new Error('Total RDA weight is zero');

  const totalStudents = studentsRes.rows.length;

  // School-wide simple average for scoring
  const perStudent = {};
  for (const n of NUTRIENTS)
    perStudent[n] = Math.round((total[n] / totalStudents) * 100) / 100;

  // PM-POSHAN split — allocate meal proportionally then divide by level count
  // Only calories and protein needed for PM-POSHAN check
  const primaryPerStudent = {};
  const upperPerStudent   = {};

  if (primaryCount > 0 && totalRdaWeight > 0) {
    const primaryShare = total.calories * (primaryRdaWeight / totalRdaWeight);
    const primaryProteinShare = total.protein * (primaryRdaWeight / totalRdaWeight);
    primaryPerStudent.calories = Math.round((primaryShare / primaryCount) * 100) / 100;
    primaryPerStudent.protein  = Math.round((primaryProteinShare / primaryCount) * 100) / 100;
  }

  if (upperCount > 0 && totalRdaWeight > 0) {
    const upperShare = total.calories * (upperRdaWeight / totalRdaWeight);
    const upperProteinShare = total.protein * (upperRdaWeight / totalRdaWeight);
    upperPerStudent.calories = Math.round((upperShare / upperCount) * 100) / 100;
    upperPerStudent.protein  = Math.round((upperProteinShare / upperCount) * 100) / 100;
  }

  return {
    totalStudents, totalRdaWeight, perStudent,
    primaryCount, primaryRdaWeight, primaryPerStudent,
    upperCount, upperRdaWeight, upperPerStudent,
  };
};

// =============================================================
// 3. SAVE DISTRIBUTION  (one row per meal, upsert)
// =============================================================
export const saveDistribution = async (meal_id, dist) => {
  const {
    totalStudents, totalRdaWeight, perStudent,
    primaryCount, primaryRdaWeight, primaryPerStudent,
    upperCount, upperRdaWeight, upperPerStudent,
  } = dist;
  await pool.query(
    `INSERT INTO meal_distributions (
       meal_id, total_students, total_rda_weight,
       per_student_calories, per_student_protein, per_student_carbs,
       per_student_fat, per_student_fiber, per_student_iron, per_student_calcium,
       primary_student_count, primary_rda_weight,
       primary_per_student_calories, primary_per_student_protein,
       upper_primary_student_count, upper_primary_rda_weight,
       upper_primary_per_student_calories, upper_primary_per_student_protein,
       computed_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
     ON CONFLICT (meal_id) DO UPDATE SET
       total_students                     = EXCLUDED.total_students,
       total_rda_weight                   = EXCLUDED.total_rda_weight,
       per_student_calories               = EXCLUDED.per_student_calories,
       per_student_protein                = EXCLUDED.per_student_protein,
       per_student_carbs                  = EXCLUDED.per_student_carbs,
       per_student_fat                    = EXCLUDED.per_student_fat,
       per_student_fiber                  = EXCLUDED.per_student_fiber,
       per_student_iron                   = EXCLUDED.per_student_iron,
       per_student_calcium                = EXCLUDED.per_student_calcium,
       primary_student_count              = EXCLUDED.primary_student_count,
       primary_rda_weight                 = EXCLUDED.primary_rda_weight,
       primary_per_student_calories       = EXCLUDED.primary_per_student_calories,
       primary_per_student_protein        = EXCLUDED.primary_per_student_protein,
       upper_primary_student_count        = EXCLUDED.upper_primary_student_count,
       upper_primary_rda_weight           = EXCLUDED.upper_primary_rda_weight,
       upper_primary_per_student_calories = EXCLUDED.upper_primary_per_student_calories,
       upper_primary_per_student_protein  = EXCLUDED.upper_primary_per_student_protein,
       computed_at                        = NOW()`,
    [
      meal_id, totalStudents, totalRdaWeight,
      perStudent.calories, perStudent.protein, perStudent.carbs,
      perStudent.fat, perStudent.fiber, perStudent.iron, perStudent.calcium,
      primaryCount || 0, primaryRdaWeight || 0,
      primaryPerStudent.calories || null, primaryPerStudent.protein || null,
      upperCount || 0, upperRdaWeight || 0,
      upperPerStudent.calories || null, upperPerStudent.protein || null,
    ]
  );
};

// =============================================================
// 4. MEAL SCORING
// =============================================================
export const scoreMeal = (mealNutrients, rdaTargets, weights = SCORE_WEIGHTS_DEFAULT) => {
  let scoreSum  = 0;
  let weightSum = 0;
  let hasSevere = false;
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
// 5. PM-POSHAN BENCHMARKING
// =============================================================
// pmSplit = { primary: { calories, protein }, upper_primary: { calories, protein } }
// If a level has no students (null values), status is 'no_students'.
export const checkPmPoshan = (pmSplit) => {
  const results = {};
  for (const [level, targets] of Object.entries(PM_POSHAN)) {
    const provided = pmSplit[level];

    if (!provided || provided.calories === null || provided.calories === undefined) {
      results[level] = {
        target_calories: targets.calories,
        target_protein:  targets.protein,
        provided_calories: null,
        provided_protein:  null,
        calorie_pct:  null,
        protein_pct:  null,
        status: 'no_students',
        note: `No classes assigned as ${level.replace('_', ' ')} in this school`,
      };
      continue;
    }

    const calPct  = targets.calories > 0 ? (provided.calories / targets.calories) * 100 : 100;
    const protPct = targets.protein  > 0 ? (provided.protein  / targets.protein)  * 100 : 100;
    const pct     = Math.min(calPct, protPct);
    let status;
    if (pct >= 90)      status = 'meeting_standard';
    else if (pct >= 70) status = 'partial';
    else                status = 'below_target';

    results[level] = {
      target_calories:   targets.calories,
      target_protein:    targets.protein,
      provided_calories: Math.round(provided.calories * 10) / 10,
      provided_protein:  Math.round(provided.protein  * 10) / 10,
      calorie_pct:  Math.round(calPct  * 10) / 10,
      protein_pct:  Math.round(protPct * 10) / 10,
      status,
    };
  }
  return results;
};

// =============================================================
// 6. DEFICIENCY-BASED SUGGESTIONS
// =============================================================
export const getSuggestions = async (deficits) => {
  if (!deficits || deficits.length === 0) return [];
  const suggestions = [];
  for (const nutrient of deficits) {
    const rows = await pool.query(
      `SELECT suggestion, category FROM nutrition_suggestions
       WHERE nutrient = $1 ORDER BY priority ASC LIMIT 3`,
      [nutrient]
    );
    rows.rows.forEach(r => suggestions.push({ nutrient, suggestion: r.suggestion, category: r.category }));
  }
  const seen = new Set();
  return suggestions.filter(s => {
    if (seen.has(s.suggestion)) return false;
    seen.add(s.suggestion);
    return true;
  });
};

// =============================================================
// 7. WEIGHTED RDA BASELINE FROM REAL STUDENT MIX
// Computes average RDA across all students in a school.
// Used for scoring — represents the "typical student" target.
// =============================================================
export const computeSchoolRdaBaseline = async (school_id) => {
  const studentsRes = await pool.query(
    `SELECT s.age, s.gender FROM students s WHERE s.school_id = $1`,
    [school_id]
  );
  if (studentsRes.rows.length === 0) {
    return { calories: 1600, protein: 35, carbs: 220, fat: 40, fiber: 20, iron: 12, calcium: 900 };
  }

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
// 8. MEAL QUALITY EXPLANATION
// =============================================================
const NUTRIENT_LABELS = {
  calories: 'Energy (calories)', protein: 'Protein', carbs: 'Carbohydrates',
  fat: 'Fat', fiber: 'Dietary fibre', iron: 'Iron', calcium: 'Calcium',
};
const PM_POSHAN_TARGETS = {
  primary:       { calories: 450, protein: 12 },
  upper_primary: { calories: 700, protein: 20 },
};

export const generateMealExplanation = (perStudent, rdaForMeal, scoringBreakdown, pmPoshan) => {
  const lines = [];
  for (const [nutrient, data] of Object.entries(scoringBreakdown)) {
    const label    = NUTRIENT_LABELS[nutrient] || nutrient;
    const { adequacy, provided, rda } = data;
    if (adequacy >= 100)
      lines.push(`✅ ${label}: Meets the RDA target (${provided} provided vs ${rda} required).`);
    else if (adequacy >= 75)
      lines.push(`🟡 ${label}: Slightly below target — ${provided} provided, ${rda} required (${adequacy}% met).`);
    else if (adequacy >= 50)
      lines.push(`🟠 ${label}: Moderately insufficient — only ${adequacy}% of the RDA is met (${provided} vs ${rda}).`);
    else
      lines.push(`🔴 ${label}: Severely insufficient — only ${adequacy}% met (${provided} provided, ${rda} required).`);
  }
  lines.push('');
  lines.push('📋 PM-POSHAN Benchmark:');
  for (const [level, result] of Object.entries(pmPoshan)) {
    const levelLabel = level === 'primary' ? 'Primary (Grades 1–5)' : 'Upper Primary (Grades 6–8)';
    const targets    = PM_POSHAN_TARGETS[level];
    if (result.status === 'meeting_standard')
      lines.push(`  ✅ ${levelLabel}: Meets PM-POSHAN standard (≥90% of ${targets.calories} kcal / ${targets.protein}g protein).`);
    else if (result.status === 'partial')
      lines.push(`  🟡 ${levelLabel}: Partially meets standard. Calories at ${result.calorie_pct}%, protein at ${result.protein_pct}% of target.`);
    else
      lines.push(`  🔴 ${levelLabel}: Below PM-POSHAN expectation. Only ${result.calorie_pct}% energy and ${result.protein_pct}% protein met.`);
  }
  if (scoringBreakdown.iron && scoringBreakdown.iron.adequacy < 75)
    lines.push(`  ⚠️  Iron is below expectation — consider palak, masoor dal, or jaggery.`);
  return lines.join('\n');
};

// =============================================================
// 9. FULL MEAL SUMMARY
// For today's meal: recomputes live from current students.
// For locked (past) meals: reads saved snapshot — never touches
// live student data so additions/deletions don't affect history.
// =============================================================
export const computeMealSummary = async (meal_id) => {
  const totals = await calculateMealNutrients(meal_id);

  const mealRow = await pool.query(
    `SELECT school_id, served_date,
            (served_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date) AS is_locked
     FROM meals WHERE id = $1`,
    [meal_id]
  );
  if (mealRow.rows.length === 0) throw new Error('Meal not found');
  const { school_id, is_locked } = mealRow.rows[0];

  const LUNCH_FRACTION = 0.40;

  // ── LOCKED MEAL ───────────────────────────────────────────────
  if (is_locked) {
    const savedSummary = await pool.query(
      `SELECT * FROM meal_nutrition_summary WHERE meal_id = $1`, [meal_id]
    );
    const savedDist = await pool.query(
      `SELECT * FROM meal_distributions WHERE meal_id = $1`, [meal_id]
    );

    // Full snapshot exists — use it directly, zero live queries
    if (savedSummary.rows.length > 0 && savedSummary.rows[0].per_student_calories !== null) {
      const s = savedSummary.rows[0];
      const perStudent = {};
      const rdaForMeal = {};
      for (const n of NUTRIENTS) {
        perStudent[n] = parseFloat(s[`per_student_${n}`] || 0);
        rdaForMeal[n] = parseFloat(s[`rda_${n}`] || 0);
      }
      const scoringWeights = await loadScoringWeights();
      const scoring  = scoreMeal(perStudent, rdaForMeal, scoringWeights);
      const d = savedDist.rows[0];
      const pmSplit = {
        primary: d && d.primary_student_count > 0
          ? { calories: parseFloat(d.primary_per_student_calories), protein: parseFloat(d.primary_per_student_protein) }
          : null,
        upper_primary: d && d.upper_primary_student_count > 0
          ? { calories: parseFloat(d.upper_primary_per_student_calories), protein: parseFloat(d.upper_primary_per_student_protein) }
          : null,
      };
      const pmPoshan = checkPmPoshan(pmSplit);
      const deficits = Object.entries(scoring.breakdown)
        .filter(([, v]) => v.adequacy < 75).map(([n]) => n);
      const suggestions = await getSuggestions(deficits);
      const explanation = generateMealExplanation(perStudent, rdaForMeal, scoring.breakdown, pmPoshan);
      return {
        meal_id,
        is_locked:          true,
        student_count:      parseInt(s.student_count) || 0,
        total_rda_weight:   d ? parseFloat(d.total_rda_weight) : 0,
        total_nutrients:    totals,
        per_student:        perStudent,
        rda_for_meal:       rdaForMeal,
        score:              scoring.score,
        score_label:        scoring.label,
        nutrient_breakdown: scoring.breakdown,
        pm_poshan:          pmPoshan,
        deficiencies:       deficits,
        suggestions,
        explanation,
        distribution:       savedDist.rows[0] || null,
      };
    }

    // No snapshot yet — build from saved distribution (one-time fallback)
    const distRow = savedDist.rows[0];
    let perStudent = {};
    let studentCount = 1;
    let totalRdaWeight = 0;

    if (distRow) {
      studentCount   = parseInt(distRow.total_students) || 1;
      totalRdaWeight = parseFloat(distRow.total_rda_weight) || 0;
      for (const n of NUTRIENTS)
        perStudent[n] = parseFloat(distRow[`per_student_${n}`] || 0);
    } else {
      // Absolute fallback — no dist row either
      const countRes = await pool.query(
        `SELECT COUNT(*) AS total FROM students WHERE school_id = $1`, [school_id]
      );
      studentCount = parseInt(countRes.rows[0].total) || 1;
      for (const n of NUTRIENTS)
        perStudent[n] = Math.round((totals[n] / studentCount) * 100) / 100;
    }

    const baseline   = await computeSchoolRdaBaseline(school_id);
    const rdaForMeal = {};
    for (const n of NUTRIENTS)
      rdaForMeal[n] = Math.round(baseline[n] * LUNCH_FRACTION * 100) / 100;

    const scoringWeights = await loadScoringWeights();
    const scoring  = scoreMeal(perStudent, rdaForMeal, scoringWeights);
    // No split data in old dist row — show no_students for both levels
    const pmPoshan = checkPmPoshan({ primary: null, upper_primary: null });
    const deficits = Object.entries(scoring.breakdown)
      .filter(([, v]) => v.adequacy < 75).map(([n]) => n);
    const suggestions = await getSuggestions(deficits);
    const explanation = generateMealExplanation(perStudent, rdaForMeal, scoring.breakdown, pmPoshan);

    // Save snapshot so future calls never recompute again
    await pool.query(
      `INSERT INTO meal_nutrition_summary (
         meal_id,
         total_calories, total_protein, total_carbs, total_fat, total_fiber, total_iron, total_calcium,
         per_student_calories, per_student_protein, per_student_carbs, per_student_fat,
         per_student_fiber, per_student_iron, per_student_calcium,
         rda_calories, rda_protein, rda_carbs, rda_fat, rda_fiber, rda_iron, rda_calcium,
         student_count, score, score_label, pm_poshan_status, computed_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,NOW())
       ON CONFLICT (meal_id) DO UPDATE SET
         per_student_calories = EXCLUDED.per_student_calories,
         per_student_protein  = EXCLUDED.per_student_protein,
         per_student_carbs    = EXCLUDED.per_student_carbs,
         per_student_fat      = EXCLUDED.per_student_fat,
         per_student_fiber    = EXCLUDED.per_student_fiber,
         per_student_iron     = EXCLUDED.per_student_iron,
         per_student_calcium  = EXCLUDED.per_student_calcium,
         rda_calories = EXCLUDED.rda_calories, rda_protein  = EXCLUDED.rda_protein,
         rda_carbs    = EXCLUDED.rda_carbs,    rda_fat      = EXCLUDED.rda_fat,
         rda_fiber    = EXCLUDED.rda_fiber,    rda_iron     = EXCLUDED.rda_iron,
         rda_calcium  = EXCLUDED.rda_calcium,
         student_count = EXCLUDED.student_count,
         score = EXCLUDED.score, score_label = EXCLUDED.score_label,
         pm_poshan_status = EXCLUDED.pm_poshan_status`,
      [
        meal_id,
        totals.calories, totals.protein, totals.carbs, totals.fat,
        totals.fiber, totals.iron, totals.calcium,
        perStudent.calories, perStudent.protein, perStudent.carbs, perStudent.fat,
        perStudent.fiber, perStudent.iron, perStudent.calcium,
        rdaForMeal.calories, rdaForMeal.protein, rdaForMeal.carbs, rdaForMeal.fat,
        rdaForMeal.fiber, rdaForMeal.iron, rdaForMeal.calcium,
        studentCount, scoring.score, scoring.label, pmPoshan.primary.status,
      ]
    );

    return {
      meal_id,
      is_locked:          true,
      student_count:      studentCount,
      total_rda_weight:   totalRdaWeight,
      total_nutrients:    totals,
      per_student:        perStudent,
      rda_for_meal:       rdaForMeal,
      score:              scoring.score,
      score_label:        scoring.label,
      nutrient_breakdown: scoring.breakdown,
      pm_poshan:          pmPoshan,
      deficiencies:       deficits,
      suggestions,
      explanation,
      distribution:       distRow || null,
    };
  }

  // ── TODAY'S MEAL: recompute live ──────────────────────────────
  let dist = null;
  let studentCount = 1;
  let totalRdaWeight = 0;
  let perStudent = {};

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM students WHERE school_id = $1`, [school_id]
    );
    studentCount = parseInt(countRes.rows[0].total) || 1;

    if (studentCount > 0) {
      dist = await computeDistributionByRda(totals, school_id);
      await saveDistribution(meal_id, dist);
      totalRdaWeight = dist.totalRdaWeight;
      perStudent     = dist.perStudent;
    } else {
      for (const n of NUTRIENTS)
        perStudent[n] = Math.round((totals[n] / studentCount) * 100) / 100;
    }
  } catch (distErr) {
    console.warn('Auto-distribution warning in summary:', distErr.message);
    for (const n of NUTRIENTS)
      perStudent[n] = Math.round((totals[n] / studentCount) * 100) / 100;
  }

  const rdaBaseline = await computeSchoolRdaBaseline(school_id);
  const rdaForMeal  = {};
  for (const n of NUTRIENTS)
    rdaForMeal[n] = Math.round(rdaBaseline[n] * LUNCH_FRACTION * 100) / 100;

  const scoringWeights = await loadScoringWeights();
  const scoring  = scoreMeal(perStudent, rdaForMeal, scoringWeights);
  const pmSplit = dist ? {
    primary:       dist.primaryCount > 0      ? dist.primaryPerStudent      : null,
    upper_primary: dist.upperCount   > 0      ? dist.upperPerStudent        : null,
  } : { primary: null, upper_primary: null };
  const pmPoshan = checkPmPoshan(pmSplit);
  const deficits = Object.entries(scoring.breakdown)
    .filter(([, v]) => v.adequacy < 75).map(([n]) => n);
  const suggestions = await getSuggestions(deficits);
  const explanation = generateMealExplanation(perStudent, rdaForMeal, scoring.breakdown, pmPoshan);

  // Save full snapshot
  await pool.query(
    `INSERT INTO meal_nutrition_summary (
       meal_id,
       total_calories, total_protein, total_carbs, total_fat, total_fiber, total_iron, total_calcium,
       per_student_calories, per_student_protein, per_student_carbs, per_student_fat,
       per_student_fiber, per_student_iron, per_student_calcium,
       rda_calories, rda_protein, rda_carbs, rda_fat, rda_fiber, rda_iron, rda_calcium,
       student_count, score, score_label, pm_poshan_status, computed_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,NOW())
     ON CONFLICT (meal_id) DO UPDATE SET
       total_calories       = EXCLUDED.total_calories,
       total_protein        = EXCLUDED.total_protein,
       total_carbs          = EXCLUDED.total_carbs,
       total_fat            = EXCLUDED.total_fat,
       total_fiber          = EXCLUDED.total_fiber,
       total_iron           = EXCLUDED.total_iron,
       total_calcium        = EXCLUDED.total_calcium,
       per_student_calories = EXCLUDED.per_student_calories,
       per_student_protein  = EXCLUDED.per_student_protein,
       per_student_carbs    = EXCLUDED.per_student_carbs,
       per_student_fat      = EXCLUDED.per_student_fat,
       per_student_fiber    = EXCLUDED.per_student_fiber,
       per_student_iron     = EXCLUDED.per_student_iron,
       per_student_calcium  = EXCLUDED.per_student_calcium,
       rda_calories         = EXCLUDED.rda_calories,
       rda_protein          = EXCLUDED.rda_protein,
       rda_carbs            = EXCLUDED.rda_carbs,
       rda_fat              = EXCLUDED.rda_fat,
       rda_fiber            = EXCLUDED.rda_fiber,
       rda_iron             = EXCLUDED.rda_iron,
       rda_calcium          = EXCLUDED.rda_calcium,
       student_count        = EXCLUDED.student_count,
       score                = EXCLUDED.score,
       score_label          = EXCLUDED.score_label,
       pm_poshan_status     = EXCLUDED.pm_poshan_status,
       computed_at          = NOW()`,
    [
      meal_id,
      totals.calories, totals.protein, totals.carbs, totals.fat,
      totals.fiber, totals.iron, totals.calcium,
      perStudent.calories, perStudent.protein, perStudent.carbs, perStudent.fat,
      perStudent.fiber, perStudent.iron, perStudent.calcium,
      rdaForMeal.calories, rdaForMeal.protein, rdaForMeal.carbs, rdaForMeal.fat,
      rdaForMeal.fiber, rdaForMeal.iron, rdaForMeal.calcium,
      studentCount, scoring.score, scoring.label, pmPoshan.primary.status,
    ]
  );

  return {
    meal_id,
    is_locked:          false,
    student_count:      studentCount,
    total_rda_weight:   totalRdaWeight,
    total_nutrients:    totals,
    per_student:        perStudent,
    rda_for_meal:       rdaForMeal,
    score:              scoring.score,
    score_label:        scoring.label,
    nutrient_breakdown: scoring.breakdown,
    pm_poshan:          pmPoshan,
    deficiencies:       deficits,
    suggestions,
    explanation,
    distribution:       dist ? { total_students: dist.totalStudents, total_rda_weight: dist.totalRdaWeight, per_student: dist.perStudent } : null,
  };
};