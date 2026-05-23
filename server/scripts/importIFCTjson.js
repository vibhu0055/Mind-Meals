import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../database/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * =========================================================
 * CURATED FOOD IMPORTER
 * =========================================================
 *
 * Goal:
 * - Import ONLY practical foods
 * - Keep DB clean and searchable
 * - Avoid IFCT noise
 * - Keep only nutrients we need
 *
 * Nutrients:
 * - calories
 * - protein
 * - carbs
 * - fat
 * - fiber
 * - iron
 * - calcium
 *
 * =========================================================
 */

/**
 * =========================================================
 * FOOD WHITELIST
 * =========================================================
 *
 * ONLY foods matching these keywords
 * will be imported.
 *
 * Keep this list curated manually.
 */

const EXCLUDED_TERMS = [
  // prepared foods
  'omelet',
  'omlet',
  'fried',
  'cooked',
  'roasted',
  'boiled',
  'baked',
  'grilled',
  'steamed',
  'canned',
  'processed',

  // noisy descriptors
  'big',
  'small',

  // fish contamination
  'milk fish',
  'fish egg',
  'eggs cat fish',

  // oils
  'bran oil',

  // parts
  'yolk',

  // unwanted processing
  'puffed',

  // avoid duplicate rice variants
  'flakes',
];


const CURATED_KEYWORDS = [

  // =====================================================
  // RICE / GRAINS
  // =====================================================

  'rice',
  'brown rice',
  'raw white rice',
  'parboiled rice',
  'red rice',
  'black rice',
  'basmati rice',
  'puffed rice',
  'rice flakes',
  'poha',

  'wheat',
  'atta',
  'maida',
  'suji',
  'semolina',
  'broken wheat',
  'dalia',

  'oats',
  'barley',
  'quinoa',

  'ragi',
  'bajra',
  'jowar',
  'foxtail millet',
  'little millet',
  'kodo millet',
  'barnyard millet',
  'proso millet',

  'corn',
  'maize',

  // =====================================================
  // PULSES / LEGUMES
  // =====================================================

  'toor dal',
  'tur dal',
  'arhar dal',

  'moong dal',
  'green gram',

  'masoor dal',

  'urad dal',
  'black gram',

  'chana dal',
  'bengal gram',

  'rajma',
  'kidney bean',

  'chickpea',
  'kabuli chana',

  'lobia',
  'cowpea',

  'peas',
  'green peas',

  'soybean',
  'soya',

  'horse gram',

  // =====================================================
  // VEGETABLES
  // =====================================================

  'potato',
  'sweet potato',

  'onion',
  'spring onion',

  'tomato',

  'carrot',
  'beetroot',
  'radish',
  'turnip',

  'brinjal',
  'eggplant',

  'lady finger',
  'okra',

  'capsicum',

  'cabbage',
  'cauliflower',
  'broccoli',

  'spinach',
  'palak',

  'fenugreek',
  'methi',

  'amaranth',
  'bathua',

  'bottle gourd',
  'lauki',

  'ridge gourd',
  'sponge gourd',

  'bitter gourd',
  'karela',

  'pumpkin',
  'ash gourd',

  'cucumber',

  'beans',
  'broad beans',
  'cluster beans',

  'drumstick',

  'mushroom',

  'jackfruit',

  'raw banana',

  'yam',

  'tapioca',

  'colocasia',

  'garlic',
  'ginger',

  'green chilli',

  'coriander leaves',
  'mint leaves',
  'curry leaves',

  // =====================================================
  // FRUITS
  // =====================================================

  'banana',
  'apple',
  'orange',
  'mosambi',
  'sweet lime',

  'mango',
  'papaya',
  'guava',
  'watermelon',
  'muskmelon',

  'pineapple',
  'grapes',

  'pomegranate',

  'pear',
  'peach',
  'plum',
  'kiwi',

  'avocado',

  'strawberry',
  'blackberry',

  'dates',
  'raisins',

  'fig',

  'coconut',

  // =====================================================
  // DAIRY
  // =====================================================

  'milk',

  'curd',
  'yogurt',

  'paneer',

  'cheese',

  'buttermilk',

  'ghee',

  'butter',

  // =====================================================
  // EGGS
  // =====================================================

  'egg',

  // =====================================================
  // CHICKEN / MEAT
  // =====================================================

  'chicken',

  'mutton',


  // =====================================================
  // FISH / SEAFOOD
  // =====================================================

  'fish',

  'catla',
  'rohu',

  'anchovy',

  'pomfret',

  'tuna',

  'salmon',

  'sardine',

  'mackerel',

  'prawn',
  'shrimp',

  'crab',

  // =====================================================
  // NUTS / SEEDS
  // =====================================================

  'almond',

  'cashew',

  'peanut',

  'walnut',

  'pistachio',

  'flaxseed',

  'chia seed',

  'sesame',

  'sunflower seed',

  'pumpkin seed',

  // =====================================================
  // OILS / FATS
  // =====================================================

  'olive oil',

  'groundnut oil',

  'mustard oil',

  'sunflower oil',

  'soybean oil',

  'rice bran oil',

  'coconut oil',

  'sesame oil',

  'ghee',

  'butter',

  // =====================================================
  // SPICES / CONDIMENTS
  // =====================================================

  'turmeric',

  'cumin',

  'coriander',

  'pepper',

  'cardamom',

  'clove',

  'cinnamon',

  'asafoetida',

  'salt',

  'jaggery',

  'sugar',

  'honey',
];

/**
 * =========================================================
 * NORMALIZATION
 * =========================================================
 */

const normalize = (str = '') =>
  str
    .toLowerCase()
    .replace(/[(),]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * =========================================================
 * CATEGORY DETECTION
 * =========================================================
 */

const getCategory = (group = '') => {
  const g = group.toLowerCase();

  if (
    g.includes('cereals') ||
    g.includes('millets')
  ) {
    return 'Cereal';
  }

  if (
    g.includes('legumes') ||
    g.includes('pulses') ||
    g.includes('beans')
  ) {
    return 'Pulses';
  }

  if (g.includes('green leafy')) {
    return 'Green Leafy Vegetable';
  }

  if (
    g.includes('vegetable') ||
    g.includes('roots') ||
    g.includes('tubers')
  ) {
    return 'Vegetable';
  }

  if (g.includes('fruit')) {
    return 'Fruit';
  }

  if (
    g.includes('milk') ||
    g.includes('dairy')
  ) {
    return 'Dairy';
  }

  if (g.includes('egg')) {
    return 'Egg';
  }

  if (
    g.includes('fish') ||
    g.includes('marine') ||
    g.includes('fresh water') ||
    g.includes('shellfish')
  ) {
    return 'Fish';
  }

  if (
    g.includes('meat') ||
    g.includes('poultry')
  ) {
    return 'Meat';
  }

  if (
    g.includes('nuts') ||
    g.includes('oil seeds')
  ) {
    return 'Nuts & Seeds';
  }

  if (
    g.includes('fats') ||
    g.includes('oils')
  ) {
    return 'Fat';
  }

  return 'Other';
};

/**
 * =========================================================
 * SAFE NUMBER VALIDATION
 * =========================================================
 */

const safeNumber = (value, min, max) => {
  if (value === null || value === undefined) {
    return null;
  }

  const num = Number(value);

  if (Number.isNaN(num)) {
    return null;
  }

  if (num < min || num > max) {
    return null;
  }

  return Number(num.toFixed(2));
};

/**
 * =========================================================
 * VALIDATE NUTRITION
 * =========================================================
 */

const validateNutrition = (nutrition = {}) => ({
  calories_per_100g: safeNumber(
    nutrition.energy_kcal,
    0,
    900
  ),

  protein_per_100g: safeNumber(
    nutrition.protein_g,
    0,
    100
  ),

  carbs_per_100g: safeNumber(
    nutrition.carbs_g,
    0,
    100
  ),

  fat_per_100g: safeNumber(
    nutrition.fat_g,
    0,
    100
  ),

  fiber_per_100g: safeNumber(
    nutrition.fiber_g,
    0,
    100
  ),

  iron_mg_per_100g: safeNumber(
    nutrition.iron_mg,
    0,
    100
  ),

  calcium_mg_per_100g: safeNumber(
    nutrition.calcium_mg,
    0,
    5000
  ),
});

/**
 * =========================================================
 * FOOD FILTERING
 * =========================================================
 */

const isAllowedFood = (foodName = '') => {
  const normalized = normalize(foodName);

  const hasKeyword = CURATED_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );

  if (!hasKeyword) {
    return false;
  }

  const hasExcludedTerm = EXCLUDED_TERMS.some((term) =>
    normalized.includes(term)
  );

  if (hasExcludedTerm) {
    return false;
  }

  return true;
};

/**
 * =========================================================
 * MAIN IMPORT
 * =========================================================
 */

const importIFCT = async () => {
  try {
    const filePath = join(
      __dirname,
      'ifct2017_clean.json'
    );

    const rawData = fs.readFileSync(
      filePath,
      'utf8'
    );

    const foods = JSON.parse(rawData);

    console.log(
      `📥 Total IFCT foods: ${foods.length}`
    );

    /**
     * =========================================================
     * CURATED FILTERING
     * =========================================================
     */

    const curatedFoods = foods.filter((item) => {
      if (!item?.name) return false;

      return isAllowedFood(item.name);
    });

    console.log(
      `✅ Curated foods selected: ${curatedFoods.length}`
    );

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      /**
       * =========================================================
       * SCHEMA MIGRATIONS
       * =========================================================
       */

      const ingredientMigrations = [
        `
        ALTER TABLE ingredients
        ADD COLUMN IF NOT EXISTS display_name VARCHAR(150)
        `,
        `
        ALTER TABLE ingredients
        ADD COLUMN IF NOT EXISTS category VARCHAR(100)
        `,
        `
        ALTER TABLE ingredients
        ADD COLUMN IF NOT EXISTS ifct_code VARCHAR(10)
        `,
        `
        ALTER TABLE ingredients
        ADD COLUMN IF NOT EXISTS food_group VARCHAR(100)
        `,
      ];

      for (const sql of ingredientMigrations) {
        await client.query(sql);
      }

      /**
       * =========================================================
       * UNIQUE CONSTRAINT
       * =========================================================
       */

      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'ingredients_name_unique'
          ) THEN
            ALTER TABLE ingredients
            ADD CONSTRAINT ingredients_name_unique
            UNIQUE(name);
          END IF;
        END $$;
      `);

      /**
       * =========================================================
       * NUTRITION TABLE
       * =========================================================
       */

      await client.query(`
        CREATE TABLE IF NOT EXISTS ingredient_nutrition (
          id SERIAL PRIMARY KEY,

          ingredient_id INT UNIQUE NOT NULL
          REFERENCES ingredients(id)
          ON DELETE CASCADE,

          calories_per_100g DECIMAL(6,2),
          protein_per_100g DECIMAL(6,2),
          carbs_per_100g DECIMAL(6,2),
          fat_per_100g DECIMAL(6,2),
          fiber_per_100g DECIMAL(6,2),

          iron_mg_per_100g DECIMAL(6,2),
          calcium_mg_per_100g DECIMAL(8,2)
        );
      `);

      /**
       * =========================================================
       * INDEXES
       * =========================================================
       */

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ingredients_name
        ON ingredients(name);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ingredients_category
        ON ingredients(category);
      `);

      console.log('✅ DB setup complete');

      let inserted = 0;
      let skipped = 0;

      /**
       * =========================================================
       * IMPORT LOOP
       * =========================================================
       */

      for (const item of curatedFoods) {
        const rawName = item?.name?.trim();

        if (!rawName) {
          skipped++;
          continue;
        }

        const validated = validateNutrition(
          item.nutrition
        );

        const hasNutrition =
          Object.values(validated).some(
            (v) => v !== null
          );

        if (!hasNutrition) {
          skipped++;
          continue;
        }

        const normalizedName =
          normalize(rawName);

        const displayName = rawName;

        const category = getCategory(
          item.group || ''
        );

        const ifctCode = item.code || null;

        const foodGroup = item.group || null;

        /**
         * =========================================================
         * INSERT INGREDIENT
         * =========================================================
         */

        const ingredientResult =
          await client.query(
            `
            INSERT INTO ingredients (
              name,
              display_name,
              category,
              ifct_code,
              food_group
            )
            VALUES ($1,$2,$3,$4,$5)

            ON CONFLICT (name)
            DO UPDATE SET
              display_name = EXCLUDED.display_name,
              category     = EXCLUDED.category,
              ifct_code    = EXCLUDED.ifct_code,
              food_group   = EXCLUDED.food_group

            RETURNING id
            `,
            [
              normalizedName,
              displayName,
              category,
              ifctCode,
              foodGroup,
            ]
          );

        const ingredientId =
          ingredientResult.rows[0].id;

        /**
         * =========================================================
         * INSERT NUTRITION
         * =========================================================
         */

        await client.query(
          `
          INSERT INTO ingredient_nutrition (
            ingredient_id,
            calories_per_100g,
            protein_per_100g,
            carbs_per_100g,
            fat_per_100g,
            fiber_per_100g,
            iron_mg_per_100g,
            calcium_mg_per_100g
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8
          )

          ON CONFLICT (ingredient_id)
          DO UPDATE SET
            calories_per_100g   = EXCLUDED.calories_per_100g,
            protein_per_100g    = EXCLUDED.protein_per_100g,
            carbs_per_100g      = EXCLUDED.carbs_per_100g,
            fat_per_100g        = EXCLUDED.fat_per_100g,
            fiber_per_100g      = EXCLUDED.fiber_per_100g,
            iron_mg_per_100g    = EXCLUDED.iron_mg_per_100g,
            calcium_mg_per_100g = EXCLUDED.calcium_mg_per_100g
          `,
          [
            ingredientId,
            validated.calories_per_100g,
            validated.protein_per_100g,
            validated.carbs_per_100g,
            validated.fat_per_100g,
            validated.fiber_per_100g,
            validated.iron_mg_per_100g,
            validated.calcium_mg_per_100g,
          ]
        );

        inserted++;

        if (inserted % 25 === 0) {
          console.log(
            `⏳ Processed ${inserted} foods...`
          );
        }
      }

      await client.query('COMMIT');

      console.log('\n🎉 IMPORT COMPLETE');
      console.log(
        `✅ Imported Foods: ${inserted}`
      );
      console.log(`⚠️ Skipped Foods: ${skipped}`);

    } catch (err) {
      await client.query('ROLLBACK');

      console.error('❌ DB ERROR:', err);
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('❌ FILE ERROR:', err);
  }
};

importIFCT();