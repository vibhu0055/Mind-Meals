import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../database/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const getCategory = (group) => {
  if (!group) return 'Other';
  if (group.includes('Cereals') || group.includes('Millets')) return 'Cereal';
  if (group.includes('Legumes') || group.includes('Pulses') || group.includes('Beans')) return 'Pulses';
  if (group.includes('Green Leafy')) return 'Green Leafy Vegetable';
  if (group.includes('Vegetable') || group.includes('Roots') || group.includes('Tubers')) return 'Vegetable';
  if (group.includes('Fruit')) return 'Fruit';
  if (group.includes('Milk') || group.includes('Dairy')) return 'Dairy';
  if (group.includes('Egg')) return 'Egg';
  if (group.includes('Fish') || group.includes('Marine') || group.includes('Freshwater')) return 'Fish';
  if (group.includes('Meat') || group.includes('Poultry')) return 'Meat';
  if (group.includes('Nuts') || group.includes('Oil Seeds')) return 'Nuts & Seeds';
  if (group.includes('Fats') || group.includes('Oils')) return 'Fat';
  if (group.includes('Sugar') || group.includes('Jaggery')) return 'Sugar';
  if (group.includes('Spices') || group.includes('Condiments')) return 'Spice';
  if (group.includes('Beverages')) return 'Beverage';
  return 'Other';
};

const importIFCT = async () => {
  try {
    const filePath = join(__dirname, 'ifct2017_clean.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const foods = JSON.parse(rawData);

    console.log(`📥 Total items in IFCT 2017: ${foods.length}`);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const ingredientMigrations = [
        `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS display_name  VARCHAR(150)`,
        `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS category      VARCHAR(100)`,
        `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS ifct_code     VARCHAR(10)`,
        `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS food_group    VARCHAR(100)`,
      ];
      for (const sql of ingredientMigrations) await client.query(sql);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ingredient_nutrition (
          id                  SERIAL PRIMARY KEY,
          ingredient_id       INT UNIQUE NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
          calories_per_100g   DECIMAL(8,4),
          protein_per_100g    DECIMAL(7,4),
          carbs_per_100g      DECIMAL(7,4),
          fat_per_100g        DECIMAL(7,4),
          fiber_per_100g      DECIMAL(7,4),
          iron_mg_per_100g    DECIMAL(7,4),
          calcium_mg_per_100g DECIMAL(8,4)
        );
      `);

      console.log('✅ Migrations done');

      let inserted = 0;
      let skipped  = 0;

      for (const item of foods) {
        const rawName   = item.name?.trim();
        const nutrition = item.nutrition;

        if (!rawName || !nutrition) { skipped++; continue; }

        // ✅ Use IFCT name as-is — no duplicate suffix logic
        const name        = rawName.toLowerCase();
        const displayName = rawName;
        const category    = getCategory(item.group);
        const ifctCode    = item.code  || null;
        const foodGroup   = item.group || null;

        const res = await client.query(
          `
          INSERT INTO ingredients (name, display_name, category, ifct_code, food_group)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            category     = EXCLUDED.category,
            ifct_code    = EXCLUDED.ifct_code,
            food_group   = EXCLUDED.food_group
          RETURNING id
          `,
          [name, displayName, category, ifctCode, foodGroup]
        );

        const ingredientId = res.rows[0].id;

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
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (ingredient_id) DO UPDATE SET
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
            nutrition.energy_kcal ?? null,
            nutrition.protein_g   ?? null,
            nutrition.carbs_g     ?? null,
            nutrition.fat_g       ?? null,
            nutrition.fiber_g     ?? null,
            nutrition.iron_mg     ?? null,
            nutrition.calcium_mg  ?? null,
          ]
        );

        inserted++;
        if (inserted % 50 === 0) console.log(`⏳ Processed ${inserted}...`);
      }

      await client.query('COMMIT');
      console.log(`🎉 Done! Inserted/updated: ${inserted} | Skipped: ${skipped}`);

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ DB error:', err);
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('❌ File error:', err);
  }
};

importIFCT();