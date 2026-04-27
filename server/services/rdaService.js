// =============================================================
// RDA SERVICE
// Source of truth for the personalised nutrition comparison.
//
// Flow:
//  student { age, gender } → age_group → rda_reference row
//  meal_id + student.class → meal_distributions row (intake)
//  meal.meal_type → MEAL_FRACTIONS → scaled RDA for this meal
//  gap = received - scaled_rda
//  status = deficient | adequate | excess
//  bmi_flag = true if underweight AND calorie-deficient
// =============================================================

import pool from '../database/database.js';
import { getAgeGroup, MEAL_FRACTIONS } from '../database/seedRDA.js';

const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'iron', 'calcium'];

// ── Status thresholds ─────────────────────────────────────────
// deficient : received < 90% of scaled RDA
// adequate  : 90% – 120%
// excess    : > 120%
const getNutrientStatus = (received, rda) => {
  if (!rda || rda === 0) return 'adequate';
  const pct = received / rda;
  if (pct < 0.90) return 'deficient';
  if (pct > 1.20) return 'excess';
  return 'adequate';
};

// ── Core report generator ─────────────────────────────────────
export const generateStudentReport = async (student_id, meal_id) => {

  // 1. Student + latest BMI + class group label
  const studentRes = await pool.query(
    `SELECT
       s.id, s.name, s.age, s.gender, s.class_id, s.school_id,
       hr.bmi_category,
       cg.group_label
     FROM students s
     LEFT JOIN LATERAL (
       SELECT bmi_category
       FROM health_records
       WHERE student_id = s.id
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1
     ) hr ON true
     LEFT JOIN class_groups cg ON cg.class_id = s.class_id
                               AND cg.school_id = s.school_id
     WHERE s.id = $1`,
    [student_id]
  );

  if (studentRes.rows.length === 0)
    throw new Error(`Student ${student_id} not found`);

  const student     = studentRes.rows[0];
  const age_group   = getAgeGroup(student.age);
  const gender      = (student.gender || 'other').toLowerCase();
  const group_label = student.group_label;

  if (!group_label)
    throw new Error(`Student ${student_id} class is not assigned to a group (G1-G4). Assign it first.`);

  // 2. Meal info
  const mealRes = await pool.query(
    `SELECT id, name, meal_type, served_date FROM meals WHERE id = $1`,
    [meal_id]
  );
  if (mealRes.rows.length === 0)
    throw new Error(`Meal ${meal_id} not found`);

  const meal     = mealRes.rows[0];
  const fraction = MEAL_FRACTIONS[meal.meal_type] ?? 0.33;

  // 3. What the student's group received from this meal
  const distRes = await pool.query(
    `SELECT
       calories_per_student AS calories,
       protein_per_student  AS protein,
       carbs_per_student    AS carbs,
       fat_per_student      AS fat,
       fiber_per_student    AS fiber,
       iron_per_student     AS iron,
       calcium_per_student  AS calcium
     FROM meal_distributions
     WHERE meal_id = $1 AND group_label = $2`,
    [meal_id, group_label]
  );

  if (distRes.rows.length === 0)
    throw new Error(
      `No distribution found for meal ${meal_id} group ${group_label}. ` +
      `Run POST /api/meal/${meal_id}/distribute first.`
    );

  const received = {};
  for (const n of NUTRIENTS) {
    received[n] = parseFloat(distRes.rows[0][n] || 0);
  }

  // 4. Daily RDA lookup for age_group + gender
  const rdaRes = await pool.query(
    `SELECT * FROM rda_reference
     WHERE age_group = $1 AND gender = $2
     LIMIT 1`,
    [age_group, gender === 'female' ? 'female' : gender === 'male' ? 'male' : 'other']
  );

  if (rdaRes.rows.length === 0)
    throw new Error(`No RDA data for age_group=${age_group} gender=${gender}. Run seedRDA first.`);

  const rdaDaily = rdaRes.rows[0];

  // 5. Scale daily RDA → this meal's fraction
  const rda = {
    calories: parseFloat(rdaDaily.calories_kcal || 0) * fraction,
    protein:  parseFloat(rdaDaily.protein_g     || 0) * fraction,
    carbs:    parseFloat(rdaDaily.carbs_g       || 0) * fraction,
    fat:      parseFloat(rdaDaily.fat_g         || 0) * fraction,
    fiber:    parseFloat(rdaDaily.fiber_g       || 0) * fraction,
    iron:     parseFloat(rdaDaily.iron_mg       || 0) * fraction,
    calcium:  parseFloat(rdaDaily.calcium_mg    || 0) * fraction,
  };

  // 6. Gaps and statuses
  const gap = {};
  for (const n of NUTRIENTS) {
    gap[n] = parseFloat((received[n] - rda[n]).toFixed(3));
  }

  // bmi_flag: true when student is underweight AND calorie-deficient
  const bmi_category  = student.bmi_category || null;
  const isUnderweight = (bmi_category || '').toLowerCase().includes('underweight');
  const bmi_flag      = isUnderweight && getNutrientStatus(received.calories, rda.calories) === 'deficient';

  const overall_status = getNutrientStatus(received.calories, rda.calories);

  const nutrient_breakdown = NUTRIENTS.map((n) => ({
    nutrient: n,
    received: received[n],
    rda:      parseFloat(rda[n].toFixed(3)),
    gap:      gap[n],
    status:   getNutrientStatus(received[n], rda[n]),
  }));

  // 7. Upsert into student_nutrition_reports
  await pool.query(
    `INSERT INTO student_nutrition_reports (
       student_id, meal_id, age_group, gender, bmi_category, bmi_flag,
       received_calories, received_protein, received_carbs,
       received_fat, received_fiber, received_iron, received_calcium,
       rda_calories, rda_protein, rda_carbs,
       rda_fat, rda_fiber, rda_iron, rda_calcium,
       gap_calories, gap_protein, gap_carbs,
       gap_fat, gap_fiber, gap_iron, gap_calcium,
       overall_status
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
     ON CONFLICT (student_id, meal_id) DO UPDATE SET
       age_group=EXCLUDED.age_group, gender=EXCLUDED.gender,
       bmi_category=EXCLUDED.bmi_category, bmi_flag=EXCLUDED.bmi_flag,
       received_calories=EXCLUDED.received_calories, received_protein=EXCLUDED.received_protein,
       received_carbs=EXCLUDED.received_carbs, received_fat=EXCLUDED.received_fat,
       received_fiber=EXCLUDED.received_fiber, received_iron=EXCLUDED.received_iron,
       received_calcium=EXCLUDED.received_calcium,
       rda_calories=EXCLUDED.rda_calories, rda_protein=EXCLUDED.rda_protein,
       rda_carbs=EXCLUDED.rda_carbs, rda_fat=EXCLUDED.rda_fat,
       rda_fiber=EXCLUDED.rda_fiber, rda_iron=EXCLUDED.rda_iron,
       rda_calcium=EXCLUDED.rda_calcium,
       gap_calories=EXCLUDED.gap_calories, gap_protein=EXCLUDED.gap_protein,
       gap_carbs=EXCLUDED.gap_carbs, gap_fat=EXCLUDED.gap_fat,
       gap_fiber=EXCLUDED.gap_fiber, gap_iron=EXCLUDED.gap_iron,
       gap_calcium=EXCLUDED.gap_calcium,
       overall_status=EXCLUDED.overall_status,
       generated_at=NOW()`,
    [
      student_id, meal_id, age_group, gender, bmi_category, bmi_flag,
      received.calories, received.protein, received.carbs,
      received.fat, received.fiber, received.iron, received.calcium,
      rda.calories, rda.protein, rda.carbs,
      rda.fat, rda.fiber, rda.iron, rda.calcium,
      gap.calories, gap.protein, gap.carbs,
      gap.fat, gap.fiber, gap.iron, gap.calcium,
      overall_status,
    ]
  );

  return {
    student_id,
    student_name:  student.name,
    meal_id,
    meal_name:     meal.name,
    meal_type:     meal.meal_type,
    served_date:   meal.served_date,
    group_label,
    age_group,
    gender,
    bmi_category,
    bmi_flag,
    overall_status,
    meal_fraction:      fraction,
    nutrient_breakdown,
  };
};