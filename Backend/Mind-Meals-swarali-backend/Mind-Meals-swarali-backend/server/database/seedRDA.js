// =============================================================
// SEED RDA — ICMR-NIN Recommended Dietary Allowances 2020
// Source: National Institute of Nutrition, ICMR, Hyderabad
// https://www.nin.res.in
//
// age_group mapping from student.age (integer):
//   age 6–8   → '6-9'
//   age 9–11  → '9-12'
//   age 12–14 → '13-15'
//   age 15+   → '16-17'
//
// iron_mg for females 9+ is 27mg — accounts for menstrual loss
// calcium_mg 1200mg for age 9+ — peak bone development period
// =============================================================

import pool from '../database/database.js';

const RDA_DATA = [
  // ── Ages 6–8 ─────────────────────────────────────────────
  {
    age_group: '6-9', gender: 'male',
    calories_kcal: 1690, protein_g: 29.5,
    carbs_g: 230, fat_g: 37, fiber_g: 17,
    iron_mg: 9, calcium_mg: 800,
  },
  {
    age_group: '6-9', gender: 'female',
    calories_kcal: 1530, protein_g: 28.5,
    carbs_g: 210, fat_g: 34, fiber_g: 17,
    iron_mg: 9, calcium_mg: 800,
  },
  {
    age_group: '6-9', gender: 'other',
    calories_kcal: 1530, protein_g: 28.5,
    carbs_g: 210, fat_g: 34, fiber_g: 17,
    iron_mg: 9, calcium_mg: 800,
  },

  // ── Ages 9–11 ─────────────────────────────────────────────
  // Girls iron jumps to 27mg from age 9 (pre-menarche onset)
  {
    age_group: '9-12', gender: 'male',
    calories_kcal: 2190, protein_g: 40.0,
    carbs_g: 301, fat_g: 48, fiber_g: 22,
    iron_mg: 13, calcium_mg: 1200,
  },
  {
    age_group: '9-12', gender: 'female',
    calories_kcal: 2010, protein_g: 46.0,
    carbs_g: 276, fat_g: 44, fiber_g: 22,
    iron_mg: 27, calcium_mg: 1200,
  },
  {
    age_group: '9-12', gender: 'other',
    calories_kcal: 2010, protein_g: 46.0,
    carbs_g: 276, fat_g: 44, fiber_g: 22,
    iron_mg: 27, calcium_mg: 1200,
  },

  // ── Ages 12–14 ────────────────────────────────────────────
  // Boys calorie need rises sharply — rapid muscle growth
  {
    age_group: '13-15', gender: 'male',
    calories_kcal: 2750, protein_g: 54.0,
    carbs_g: 378, fat_g: 61, fiber_g: 28,
    iron_mg: 14, calcium_mg: 1200,
  },
  {
    age_group: '13-15', gender: 'female',
    calories_kcal: 2330, protein_g: 52.0,
    carbs_g: 319, fat_g: 52, fiber_g: 25,
    iron_mg: 27, calcium_mg: 1200,
  },
  {
    age_group: '13-15', gender: 'other',
    calories_kcal: 2330, protein_g: 52.0,
    carbs_g: 319, fat_g: 52, fiber_g: 25,
    iron_mg: 27, calcium_mg: 1200,
  },

  // ── Ages 15–17 ────────────────────────────────────────────
  {
    age_group: '16-17', gender: 'male',
    calories_kcal: 3020, protein_g: 60.0,
    carbs_g: 415, fat_g: 67, fiber_g: 30,
    iron_mg: 14, calcium_mg: 1200,
  },
  {
    age_group: '16-17', gender: 'female',
    calories_kcal: 2440, protein_g: 55.0,
    carbs_g: 334, fat_g: 54, fiber_g: 26,
    iron_mg: 27, calcium_mg: 1200,
  },
  {
    age_group: '16-17', gender: 'other',
    calories_kcal: 2440, protein_g: 55.0,
    carbs_g: 334, fat_g: 54, fiber_g: 26,
    iron_mg: 27, calcium_mg: 1200,
  },
];

export const seedRDA = async () => {
  try {
    let inserted = 0, skipped = 0;
    for (const row of RDA_DATA) {
      const result = await pool.query(
        `INSERT INTO rda_reference
           (age_group, gender, calories_kcal, protein_g, carbs_g,
            fat_g, fiber_g, iron_mg, calcium_mg)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (age_group, gender) DO NOTHING
         RETURNING id`,
        [
          row.age_group, row.gender,
          row.calories_kcal, row.protein_g, row.carbs_g,
          row.fat_g, row.fiber_g, row.iron_mg, row.calcium_mg,
        ]
      );
      result.rows.length > 0 ? inserted++ : skipped++;
    }
    console.log(`✅ RDA seeded — ${inserted} inserted, ${skipped} already existed`);
  } catch (err) {
    console.error('❌ Error seeding RDA:', err);
    throw err;
  }
};

// ── Maps student.age (integer) → age_group string ────────────
export const getAgeGroup = (age) => {
  if (age <= 8)  return '6-9';
  if (age <= 11) return '9-12';
  if (age <= 14) return '13-15';
  return '16-17';
};

// ── Fraction of daily RDA per meal type ──────────────────────
// Based on standard Indian meal pattern:
// breakfast 25%, lunch 40%, dinner 30%, snack 10%
export const MEAL_FRACTIONS = {
  breakfast: 0.25,
  lunch:     0.40,
  dinner:    0.30,
  snack:     0.10,
};