// =============================================================
// SEED RDA — ICMR-NIN Recommended Dietary Allowances 2020
// Source: National Institute of Nutrition, ICMR, Hyderabad
//
// age_group mapping from student.age (integer):
//   age <= 8   → '6-9'
//   age 9–11   → '9-12'
//   age 12–14  → '13-15'
//   age 15+    → '16-17'
//
// iron_mg for females 9+ = 27mg (accounts for menstrual loss)
// calcium_mg 1200mg for age 9+ (peak bone development)
// =============================================================

import pool from '../database/database.js';

const RDA_DATA = [
  // ── Ages 6–8 ─────────────────────────────────────────────
  { age_group: '6-9',  gender: 'male',   calories_kcal: 1690, protein_g: 29.5, carbs_g: 230, fat_g: 37, fiber_g: 17, iron_mg: 9,  calcium_mg: 800  },
  { age_group: '6-9',  gender: 'female', calories_kcal: 1530, protein_g: 28.5, carbs_g: 210, fat_g: 34, fiber_g: 17, iron_mg: 9,  calcium_mg: 800  },
  // ── Ages 9–11 ─────────────────────────────────────────────
  { age_group: '9-12', gender: 'male',   calories_kcal: 2190, protein_g: 40.0, carbs_g: 301, fat_g: 48, fiber_g: 22, iron_mg: 13, calcium_mg: 1200 },
  { age_group: '9-12', gender: 'female', calories_kcal: 2010, protein_g: 46.0, carbs_g: 276, fat_g: 44, fiber_g: 22, iron_mg: 27, calcium_mg: 1200 },
  // ── Ages 12–14 ────────────────────────────────────────────
  { age_group: '13-15', gender: 'male',   calories_kcal: 2750, protein_g: 54.0, carbs_g: 378, fat_g: 61, fiber_g: 28, iron_mg: 14, calcium_mg: 1200 },
  { age_group: '13-15', gender: 'female', calories_kcal: 2330, protein_g: 52.0, carbs_g: 319, fat_g: 52, fiber_g: 25, iron_mg: 27, calcium_mg: 1200 },
  // ── Ages 15–17 ────────────────────────────────────────────
  { age_group: '16-17', gender: 'male',   calories_kcal: 3020, protein_g: 60.0, carbs_g: 415, fat_g: 67, fiber_g: 30, iron_mg: 14, calcium_mg: 1200 },
  { age_group: '16-17', gender: 'female', calories_kcal: 2440, protein_g: 55.0, carbs_g: 334, fat_g: 54, fiber_g: 26, iron_mg: 27, calcium_mg: 1200 },
];

// ── Scoring config weights ────────────────────────────────────
const SCORING_CONFIG = [
  { nutrient: 'calories', weight: 0.200 },
  { nutrient: 'protein',  weight: 0.200 },
  { nutrient: 'iron',     weight: 0.200 },
  { nutrient: 'calcium',  weight: 0.200 },
  { nutrient: 'fiber',    weight: 0.100 },
];

// ── Nutrition suggestions ─────────────────────────────────────
const SUGGESTIONS = [
  // Protein deficiency
  { nutrient: 'protein', suggestion: 'Add chana dal or moong dal to the meal — locally available and protein-rich.', category: 'pulses', priority: 1 },
  { nutrient: 'protein', suggestion: 'Include rajma or black-eyed peas (lobia) — affordable high-protein legumes.', category: 'pulses', priority: 2 },
  { nutrient: 'protein', suggestion: 'Mix soya granules into the sabzi or dal without changing the dish significantly.', category: 'pulses', priority: 3 },
  // Iron deficiency
  { nutrient: 'iron', suggestion: 'Add palak (spinach) or methi (fenugreek leaves) to dal or sabzi.', category: 'vegetables', priority: 1 },
  { nutrient: 'iron', suggestion: 'Include horse gram (kulthi) or masoor dal — both are iron-rich and low-cost.', category: 'pulses', priority: 2 },
  { nutrient: 'iron', suggestion: 'Add jaggery-based items like chikki or jaggery-rice for iron and energy.', category: 'cereals', priority: 3 },
  // Calcium deficiency
  { nutrient: 'calcium', suggestion: 'Add ragi (finger millet) flour to rotis or porridge — very high in calcium.', category: 'cereals', priority: 1 },
  { nutrient: 'calcium', suggestion: 'Include a small portion of curd or buttermilk with the meal.', category: 'dairy', priority: 2 },
  { nutrient: 'calcium', suggestion: 'Add sesame seeds (til) to the sabzi or as a chutney base.', category: 'vegetables', priority: 3 },
  // Fiber deficiency
  { nutrient: 'fiber', suggestion: 'Include whole wheat roti instead of refined flour; add bran to the dough.', category: 'cereals', priority: 1 },
  { nutrient: 'fiber', suggestion: 'Add mixed vegetables (carrot, beans, bottle gourd) to the main dish.', category: 'vegetables', priority: 2 },
  { nutrient: 'fiber', suggestion: 'Serve with a side of sprouts salad or cucumber raita.', category: 'vegetables', priority: 3 },
  // Calorie deficiency
  { nutrient: 'calories', suggestion: 'Increase serving size of rice or roti; add a small amount of ghee or oil.', category: 'cereals', priority: 1 },
  { nutrient: 'calories', suggestion: 'Add groundnut chutney or peanut-based side — calorie-dense and low-cost.', category: 'pulses', priority: 2 },
  { nutrient: 'calories', suggestion: 'Include sweet potato or banana as a supplement for energy.', category: 'vegetables', priority: 3 },
];

export const seedRDA = async () => {
  try {
    let inserted = 0, skipped = 0;
    for (const row of RDA_DATA) {
      const result = await pool.query(
        `INSERT INTO rda_reference
           (age_group, gender, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, iron_mg, calcium_mg)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (age_group, gender) DO NOTHING
         RETURNING id`,
        [row.age_group, row.gender, row.calories_kcal, row.protein_g, row.carbs_g, row.fat_g, row.fiber_g, row.iron_mg, row.calcium_mg]
      );
      result.rows.length > 0 ? inserted++ : skipped++;
    }
    console.log(`✅ RDA seeded — ${inserted} inserted, ${skipped} already existed`);

    // Seed scoring config
    for (const cfg of SCORING_CONFIG) {
      await pool.query(
        `INSERT INTO meal_scoring_config (nutrient, weight) VALUES ($1, $2)
         ON CONFLICT (nutrient) DO NOTHING`,
        [cfg.nutrient, cfg.weight]
      );
    }
    console.log('✅ Meal scoring config seeded');

    // Seed suggestions
    let sugInserted = 0;
    for (const s of SUGGESTIONS) {
      const exists = await pool.query(
        `SELECT id FROM nutrition_suggestions WHERE nutrient = $1 AND suggestion = $2`,
        [s.nutrient, s.suggestion]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO nutrition_suggestions (nutrient, suggestion, category, priority)
           VALUES ($1, $2, $3, $4)`,
          [s.nutrient, s.suggestion, s.category, s.priority]
        );
        sugInserted++;
      }
    }
    console.log(`✅ Nutrition suggestions seeded — ${sugInserted} inserted`);

  } catch (err) {
    console.error('❌ Error seeding RDA/config:', err);
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