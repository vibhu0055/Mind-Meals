// =============================================================
// RDA SERVICE
// Personalised nutrition comparison per student per meal.
//
// Flow:
//  student { age, gender } → age_group → rda_reference row
//  total_rda_weight from saved meal_distributions snapshot
//  received_i = total_meal_n × (student_rda_cal / total_rda_weight)
//  Lunch fraction = 0.40 (PM-POSHAN standard)
//  gap = received - scaled_rda
//  status = deficient | adequate | excess
// =============================================================

import pool from '../database/database.js';
import { getAgeGroup } from '../database/seedRDA.js';

const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'iron', 'calcium'];
const LUNCH_FRACTION = 0.40;

const getNutrientStatus = (received, rda) => {
  if (!rda || rda === 0) return 'adequate';
  const pct = received / rda;
  if (pct < 0.90) return 'deficient';
  if (pct > 1.20) return 'excess';
  return 'adequate';
};

const getAdequacyCategory = (pct) => {
  if (pct < 50)  return 'Severe Deficiency';
  if (pct < 75)  return 'Moderate Deficiency';
  if (pct < 100) return 'Acceptable';
  return 'Excellent';
};

export const generateStudentReport = async (student_id, meal_id) => {

  // 1. Student + latest BMI
  const studentRes = await pool.query(
    `SELECT
       s.id, s.name, s.age, s.gender, s.class_id, s.school_id,
       hr.bmi_category
     FROM students s
     LEFT JOIN LATERAL (
       SELECT bmi_category FROM health_records
       WHERE student_id = s.id
       ORDER BY recorded_at DESC, id DESC LIMIT 1
     ) hr ON true
     WHERE s.id = $1`,
    [student_id]
  );
  if (studentRes.rows.length === 0)
    throw new Error(`Student ${student_id} not found`);

  const student   = studentRes.rows[0];
  const age_group = getAgeGroup(student.age);
  const gender    = (student.gender || 'male').toLowerCase();

  // 2. Meal info
  const mealRes = await pool.query(
    `SELECT id, name, served_date FROM meals WHERE id = $1`, [meal_id]
  );
  if (mealRes.rows.length === 0)
    throw new Error(`Meal ${meal_id} not found`);
  const meal = mealRes.rows[0];

  // 3. Total meal nutrients
  const totalsRes = await pool.query(
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
  const mealTotals = totalsRes.rows[0];

  // 4. This student's individual RDA calories
  const studentGender = gender === 'female' ? 'female' : 'male';
  const studentRdaRes = await pool.query(
    `SELECT calories_kcal FROM rda_reference
     WHERE age_group = $1 AND gender = $2 LIMIT 1`,
    [getAgeGroup(student.age || 10), studentGender]
  );
  const studentRdaCal = studentRdaRes.rows[0]
    ? parseFloat(studentRdaRes.rows[0].calories_kcal) : 1600;

  // 5. Total RDA weight — read from saved distribution snapshot.
  //    This is the value saved at the time the meal was distributed,
  //    so it reflects the student composition on that day.
  //    Using this instead of re-querying live students ensures that
  //    adding/removing students later does not change past reports.
  const distRes = await pool.query(
    `SELECT total_rda_weight, total_students FROM meal_distributions WHERE meal_id = $1`,
    [meal_id]
  );

  let totalRdaWeight;
  if (distRes.rows.length > 0 && parseFloat(distRes.rows[0].total_rda_weight) > 0) {
    totalRdaWeight = parseFloat(distRes.rows[0].total_rda_weight);
  } else {
    // Distribution not yet saved — compute live (today's meal only)
    const liveRdaRes = await pool.query(
      `SELECT COALESCE(SUM(r.calories_kcal), 0) AS total_rda_cal
       FROM students s
       JOIN rda_reference r
         ON r.age_group = (
              CASE
                WHEN s.age < 9  THEN '6-9'
                WHEN s.age < 12 THEN '9-12'
                WHEN s.age < 16 THEN '13-15'
                ELSE '16-17'
              END
            )
         AND r.gender = CASE WHEN LOWER(s.gender) = 'female' THEN 'female' ELSE 'male' END
       WHERE s.school_id = $1`,
      [student.school_id]
    );
    totalRdaWeight = parseFloat(liveRdaRes.rows[0].total_rda_cal) || 1;
  }

  // 6. Student's personal share
  //    received_i = total_meal × (student_rda / total_rda_weight)
  //    Since every student is allocated proportionally to their RDA,
  //    adequacy = received / student_rda_for_meal = constant for all students.
  const weight   = studentRdaCal / totalRdaWeight;
  const received = {};
  for (const n of NUTRIENTS) {
    received[n] = Math.round(parseFloat(mealTotals[n]) * weight * 1000) / 1000;
  }

  // 7. Daily RDA lookup for this student
  const rdaRes = await pool.query(
    `SELECT * FROM rda_reference
     WHERE age_group = $1 AND gender = $2 LIMIT 1`,
    [age_group, studentGender]
  );
  if (rdaRes.rows.length === 0)
    throw new Error(`No RDA data for age_group=${age_group} gender=${gender}. Run seedRDA first.`);

  const rdaDaily = rdaRes.rows[0];
  const rda = {
    calories: parseFloat(rdaDaily.calories_kcal || 0) * LUNCH_FRACTION,
    protein:  parseFloat(rdaDaily.protein_g     || 0) * LUNCH_FRACTION,
    carbs:    parseFloat(rdaDaily.carbs_g       || 0) * LUNCH_FRACTION,
    fat:      parseFloat(rdaDaily.fat_g         || 0) * LUNCH_FRACTION,
    fiber:    parseFloat(rdaDaily.fiber_g       || 0) * LUNCH_FRACTION,
    iron:     parseFloat(rdaDaily.iron_mg       || 0) * LUNCH_FRACTION,
    calcium:  parseFloat(rdaDaily.calcium_mg    || 0) * LUNCH_FRACTION,
  };

  // 8. Gaps, statuses, adequacy categories
  const gap = {};
  for (const n of NUTRIENTS) gap[n] = parseFloat((received[n] - rda[n]).toFixed(3));

  const bmi_category  = student.bmi_category || null;
  const isUnderweight = (bmi_category || '').toLowerCase().includes('underweight');
  const bmi_flag      = isUnderweight && getNutrientStatus(received.calories, rda.calories) === 'deficient';
  const overall_status = getNutrientStatus(received.calories, rda.calories);

  const nutrient_breakdown = NUTRIENTS.map((n) => {
    const pct = rda[n] > 0 ? (received[n] / rda[n]) * 100 : 100;
    return {
      nutrient:          n,
      received:          received[n],
      rda:               parseFloat(rda[n].toFixed(3)),
      gap:               gap[n],
      adequacy_pct:      Math.round(pct * 10) / 10,
      adequacy_category: getAdequacyCategory(pct),
      status:            getNutrientStatus(received[n], rda[n]),
    };
  });

  // 9. Upsert report
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
    student_name:   student.name,
    meal_id,
    meal_name:      meal.name,
    served_date:    meal.served_date,
    age_group,
    gender,
    bmi_category,
    bmi_flag,
    overall_status,
    meal_fraction:  LUNCH_FRACTION,
    nutrient_breakdown,
  };
};