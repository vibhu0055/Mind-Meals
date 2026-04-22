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

import pool from '../database/database.js';

// ── Static group config (Option A: stored + derived from this map) ──────────
export const GROUP_CONFIG = {
  G1: { weight: 0.8, rda_calories: 1350 },
  G2: { weight: 0.9, rda_calories: 1500 },
  G3: { weight: 1.0, rda_calories: 1700 },
  G4: { weight: 1.2, rda_calories: 2000 },
};

// ── Nutrient fields we track ─────────────────────────────────────────────────
export const NUTRIENT_FIELDS = [
  'calories_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'iron_mg',
  'calcium_mg',
  'vitamin_a_mcg',
  'vitamin_c_mg',
];

// ── Calculate total nutrients for a meal from its ingredients ─────────────────
// Returns object: { calories_kcal: X, protein_g: Y, ... }
export const calculateMealNutrients = async (meal_id) => {
  const result = await pool.query(
    `SELECT
       SUM(i.calories_kcal * mi.quantity_g / 100) AS calories_kcal,
       SUM(i.protein_g    * mi.quantity_g / 100) AS protein_g,
       SUM(i.carbs_g      * mi.quantity_g / 100) AS carbs_g,
       SUM(i.fat_g        * mi.quantity_g / 100) AS fat_g,
       SUM(i.fiber_g      * mi.quantity_g / 100) AS fiber_g,
       SUM(i.iron_mg      * mi.quantity_g / 100) AS iron_mg,
       SUM(i.calcium_mg   * mi.quantity_g / 100) AS calcium_mg,
       SUM(i.vitamin_a_mcg* mi.quantity_g / 100) AS vitamin_a_mcg,
       SUM(i.vitamin_c_mg * mi.quantity_g / 100) AS vitamin_c_mg
     FROM meal_ingredients mi
     JOIN ingredients i ON mi.ingredient_id = i.id
     WHERE mi.meal_id = $1`,
    [meal_id]
  );

  // Coerce null → 0 for every field
  const raw = result.rows[0];
  const totals = {};
  for (const field of NUTRIENT_FIELDS) {
    totals[field] = parseFloat(raw[field] ?? 0);
  }
  return totals;
};

// ── Get student counts per group for a school ─────────────────────────────────
// Returns: { G1: 40, G2: 45, G3: 50, G4: 35 }
export const getStudentCountsByGroup = async (school_id) => {
  const result = await pool.query(
    `SELECT cg.group_label, COUNT(s.id) AS student_count
     FROM class_groups cg
     LEFT JOIN students s
       ON s.class_id = cg.class_id AND s.school_id = cg.school_id
     WHERE cg.school_id = $1
     GROUP BY cg.group_label`,
    [school_id]
  );

  const counts = { G1: 0, G2: 0, G3: 0, G4: 0 };
  for (const row of result.rows) {
    counts[row.group_label] = parseInt(row.student_count, 10);
  }
  return counts;
};

// ── Core distribution algorithm ───────────────────────────────────────────────
// Input:  totalNutrients { calories_kcal, protein_g, ... }
//         studentCounts  { G1: 40, G2: 45, G3: 50, G4: 35 }
// Output: array of group distribution objects ready to insert into meal_distributions
export const computeDistribution = (totalNutrients, studentCounts) => {
  const groups = Object.keys(GROUP_CONFIG); // ['G1','G2','G3','G4']

  // Step 1 — weighted loads per group
  const loads = {};
  let totalLoad = 0;
  for (const g of groups) {
    const load = studentCounts[g] * GROUP_CONFIG[g].weight;
    loads[g] = load;
    totalLoad += load;
  }

  if (totalLoad === 0) {
    throw new Error('No students found in any group. Assign classes to groups first.');
  }

  // Step 2 — per-group share and per-student nutrients
  const distribution = [];
  for (const g of groups) {
    const count = studentCounts[g];
    const load = loads[g];
    const share = load / totalLoad; // fraction of total meal this group gets

    const entry = {
      group_label: g,
      student_count: count,
      weighted_load: parseFloat(load.toFixed(2)),
    };

    // Compute per-student values for every nutrient
    for (const field of NUTRIENT_FIELDS) {
      const totalForField = totalNutrients[field] ?? 0;
      const groupTotal = share * totalForField;
      // per-student = 0 if no students in this group
      const perStudent = count > 0 ? groupTotal / count : 0;

      // Map DB field names to distribution column names
      const colName = fieldToDistColumn(field);
      entry[colName] = parseFloat(perStudent.toFixed(3));
    }

    distribution.push(entry);
  }

  return distribution;
};

// ── Helper: map ingredient nutrient field → distribution column name ──────────
const fieldToDistColumn = (field) => {
  const map = {
    calories_kcal:  'calories_per_student',
    protein_g:      'protein_per_student',
    carbs_g:        'carbs_per_student',
    fat_g:          'fat_per_student',
    fiber_g:        'fiber_per_student',
    iron_mg:        'iron_per_student',
    calcium_mg:     'calcium_per_student',
    vitamin_a_mcg:  'vitamin_a_per_student',
    vitamin_c_mg:   'vitamin_c_per_student',
  };
  return map[field];
};

// ── Persist distribution rows to DB ──────────────────────────────────────────
export const saveDistribution = async (meal_id, distribution) => {
  for (const d of distribution) {
    await pool.query(
      `INSERT INTO meal_distributions
         (meal_id, group_label, student_count, weighted_load,
          calories_per_student, protein_per_student, carbs_per_student,
          fat_per_student, fiber_per_student, iron_per_student,
          calcium_per_student, vitamin_a_per_student, vitamin_c_per_student)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (meal_id, group_label) DO UPDATE SET
         student_count          = EXCLUDED.student_count,
         weighted_load          = EXCLUDED.weighted_load,
         calories_per_student   = EXCLUDED.calories_per_student,
         protein_per_student    = EXCLUDED.protein_per_student,
         carbs_per_student      = EXCLUDED.carbs_per_student,
         fat_per_student        = EXCLUDED.fat_per_student,
         fiber_per_student      = EXCLUDED.fiber_per_student,
         iron_per_student       = EXCLUDED.iron_per_student,
         calcium_per_student    = EXCLUDED.calcium_per_student,
         vitamin_a_per_student  = EXCLUDED.vitamin_a_per_student,
         vitamin_c_per_student  = EXCLUDED.vitamin_c_per_student`,
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
        d.calcium_per_student,
        d.vitamin_a_per_student,
        d.vitamin_c_per_student,
      ]
    );
  }
};