// =========================
// MEAL DISTRIBUTION SERVICE
// =========================
// Implements the weighted class-group nutrient distribution model:
//
//   G1 (classes 1-2): weight 0.8, RDA 1350 kcal
//   G2 (classes 3-4): weight 0.9, RDA 1500 kcal
//   G3 (classes 5-6): weight 1.0, RDA 1700 kcal  ← base group
//   G4 (classes 7-8): weight 1.2, RDA 2000 kcal
//
// Distribution formula:
//   weighted_load(group)    = student_count × weight
//   group_share(group)      = weighted_load / total_weighted_load
//   nutrient_for_group      = group_share × total_nutrient_in_meal
//   nutrient_per_student    = nutrient_for_group / student_count

// =========================
// MEAL DISTRIBUTION SERVICE (UPDATED)
// =========================

import pool from '../database/database.js';

// =========================
// GROUP CONFIG
// =========================
export const GROUP_CONFIG = {
  G1: { weight: 0.8, rda_calories: 1350 },
  G2: { weight: 0.9, rda_calories: 1500 },
  G3: { weight: 1.0, rda_calories: 1700 },
  G4: { weight: 1.2, rda_calories: 2000 },
};

// =========================
// CALCULATE MEAL NUTRIENTS (FIXED + SAFE)
// =========================
export const calculateMealNutrients = async (meal_id) => {
  const result = await pool.query(
    `
    SELECT
      SUM(n.calories_per_100g * mi.quantity_g / 100) AS calories,
      SUM(n.protein_per_100g  * mi.quantity_g / 100) AS protein,
      SUM(n.carbs_per_100g    * mi.quantity_g / 100) AS carbs,
      SUM(n.fat_per_100g      * mi.quantity_g / 100) AS fat,
      SUM(n.fiber_per_100g    * mi.quantity_g / 100) AS fiber,
      SUM(n.iron_mg_per_100g  * mi.quantity_g / 100) AS iron,
      SUM(n.calcium_mg_per_100g * mi.quantity_g / 100) AS calcium
    FROM meal_ingredients mi
    JOIN ingredient_nutrition n 
      ON mi.ingredient_id = n.ingredient_id
    WHERE mi.meal_id = $1
    `,
    [meal_id]
  );

  const r = result.rows[0] || {};

  return {
    calories: parseFloat(r.calories || 0),
    protein: parseFloat(r.protein || 0),
    carbs: parseFloat(r.carbs || 0),
    fat: parseFloat(r.fat || 0),
    fiber: parseFloat(r.fiber || 0),
    iron: parseFloat(r.iron || 0),
    calcium: parseFloat(r.calcium || 0),
  };
};

// =========================
// GET STUDENT COUNT BY GROUP
// =========================
export const getStudentCountsByGroup = async (school_id) => {
  const result = await pool.query(
    `
    SELECT cg.group_label, COUNT(s.id) AS count
    FROM class_groups cg
    LEFT JOIN students s
      ON s.class_id = cg.class_id
    WHERE cg.school_id = $1
    GROUP BY cg.group_label
    `,
    [school_id]
  );

  const counts = { G1: 0, G2: 0, G3: 0, G4: 0 };

  result.rows.forEach(r => {
    counts[r.group_label] = parseInt(r.count);
  });

  return counts;
};

// =========================
// DISTRIBUTION + RDA COMPARISON (UPDATED 🔥)
// =========================
export const computeDistribution = (total, counts) => {
  let totalLoad = 0;
  const loads = {};

  // Step 1: Calculate weighted load
  for (let g in GROUP_CONFIG) {
    const load = counts[g] * GROUP_CONFIG[g].weight;
    loads[g] = load;
    totalLoad += load;
  }

  if (totalLoad === 0) {
    throw new Error("No students found");
  }

  const result = [];

  // Step 2: Distribute nutrients + compare with RDA
  for (let g in GROUP_CONFIG) {
    const count = counts[g];
    const share = loads[g] / totalLoad;

    const calories_per_student = count ? (total.calories * share) / count : 0;
    const protein_per_student = count ? (total.protein * share) / count : 0;
    const carbs_per_student = count ? (total.carbs * share) / count : 0;
    const fat_per_student = count ? (total.fat * share) / count : 0;
    const fiber_per_student = count ? (total.fiber * share) / count : 0;
    const iron_per_student = count ? (total.iron * share) / count : 0;
    const calcium_per_student = count ? (total.calcium * share) / count : 0;

    const rda = GROUP_CONFIG[g].rda_calories;

    const entry = {
      group_label: g,
      student_count: count,
      weighted_load: loads[g],

      // Nutrients per student
      calories_per_student,
      protein_per_student,
      carbs_per_student,
      fat_per_student,
      fiber_per_student,
      iron_per_student,
      calcium_per_student,

      // RDA Comparison 🔥
      rda_calories: rda,
      calorie_gap: calories_per_student - rda,
      status:
        calories_per_student >= rda
          ? "adequate"
          : "deficient",
    };

    result.push(entry);
  }

  return result;
};

// =========================
// SAVE DISTRIBUTION
// =========================
export const saveDistribution = async (meal_id, distribution) => {
  for (let d of distribution) {
    await pool.query(
      `
      INSERT INTO meal_distributions (
        meal_id, group_label, student_count, weighted_load,
        calories_per_student, protein_per_student, carbs_per_student,
        fat_per_student, fiber_per_student, iron_per_student, calcium_per_student
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (meal_id, group_label) DO UPDATE SET
        student_count = EXCLUDED.student_count,
        weighted_load = EXCLUDED.weighted_load,
        calories_per_student = EXCLUDED.calories_per_student,
        protein_per_student = EXCLUDED.protein_per_student,
        carbs_per_student = EXCLUDED.carbs_per_student,
        fat_per_student = EXCLUDED.fat_per_student,
        fiber_per_student = EXCLUDED.fiber_per_student,
        iron_per_student = EXCLUDED.iron_per_student,
        calcium_per_student = EXCLUDED.calcium_per_student
      `,
      [
        meal_id,
        d.group_label,
        d.student_count,
        d.weighted_load,
        d.calories_per_student,
        d.protein_per_student,
        d.carbs_per_student,
        d.fat_per_student,
        d.fiber_per_student,
        d.iron_per_student,
        d.calcium_per_student
      ]
    );
  }
};