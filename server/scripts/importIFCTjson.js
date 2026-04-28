import fs from 'fs';
import pool from '../database/database.js';

// 🎯 Allowed keywords
const allowedKeywords = [
  'rice', 'wheat', 'bajra', 'ragi', 'barley',
  'dal', 'gram', 'moong', 'chana', 'masoor',
  'potato', 'onion', 'tomato', 'carrot', 'cabbage',
  'cauliflower', 'brinjal', 'gourd', 'capsicum',
  'spinach', 'amaranth',
  'banana', 'apple',
  'milk', 'curd', 'oil', 'sugar'
];

const isAllowed = (name) => {
  return allowedKeywords.some(keyword => name.includes(keyword));
};

// 🧠 Normalize display name
const getDisplayName = (name) => {
  if (name.includes('brinjal')) return 'Brinjal';
  if (name.includes('gourd')) return 'Gourd';
  if (name.includes('rice')) return 'Rice';
  if (name.includes('wheat')) return 'Wheat';
  if (name.includes('bajra')) return 'Bajra';
  if (name.includes('ragi')) return 'Ragi';

  if (name.includes('dal') || name.includes('gram')) return 'Dal';

  if (name.includes('potato')) return 'Potato';
  if (name.includes('onion')) return 'Onion';
  if (name.includes('tomato')) return 'Tomato';
  if (name.includes('carrot')) return 'Carrot';
  if (name.includes('cabbage')) return 'Cabbage';
  if (name.includes('cauliflower')) return 'Cauliflower';
  if (name.includes('capsicum')) return 'Capsicum';
  if (name.includes('spinach')) return 'Spinach';

  if (name.includes('banana')) return 'Banana';
  if (name.includes('apple')) return 'Apple';

  if (name.includes('milk')) return 'Milk';
  if (name.includes('oil')) return 'Oil';
  if (name.includes('sugar')) return 'Sugar';

  return name; // fallback
};

// 🧠 Category mapping
const getCategory = (group, name) => {
  if (group?.includes('Cereals')) return 'Cereal';
  if (group?.includes('Legumes')) return 'Pulses';
  if (group?.includes('Vegetables')) return 'Vegetable';
  if (group?.includes('Fruits')) return 'Fruit';

  if (name.includes('oil')) return 'Fat';
  if (name.includes('milk')) return 'Dairy';

  return 'Other';
};

const importIFCT = async () => {
  try {
    const rawData = fs.readFileSync('./ifct2017_clean.json');
    const foods = JSON.parse(rawData);

    console.log(`📥 Total items: ${foods.length}`);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let count = 0;

      for (let item of foods) {
        const name = item.name?.toLowerCase().trim();
        const nutrition = item.nutrition;
        const group = item.group;

        if (!name || !nutrition) continue;
        if (!isAllowed(name)) continue;

        const displayName = getDisplayName(name);
        const category = getCategory(group, name);

        // 1️⃣ Insert ingredient
        const res = await client.query(
          `
          INSERT INTO ingredients (name, display_name, category)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            category = EXCLUDED.category
          RETURNING id
          `,
          [name, displayName, category]
        );

        const ingredientId = res.rows[0].id;

        // 2️⃣ Insert nutrition
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
            calories_per_100g = EXCLUDED.calories_per_100g,
            protein_per_100g = EXCLUDED.protein_per_100g,
            carbs_per_100g = EXCLUDED.carbs_per_100g,
            fat_per_100g = EXCLUDED.fat_per_100g,
            fiber_per_100g = EXCLUDED.fiber_per_100g,
            iron_mg_per_100g = EXCLUDED.iron_mg_per_100g,
            calcium_mg_per_100g = EXCLUDED.calcium_mg_per_100g
          `,
          [
            ingredientId,
            nutrition.energy_kcal || null,
            nutrition.protein_g || null,
            nutrition.carbs_g || null,
            nutrition.fat_g || null,
            nutrition.fiber_g || null,
            nutrition.iron_mg || null,
            nutrition.calcium_mg || null
          ]
        );

        count++;

        if (count % 20 === 0) {
          console.log(`⏳ Inserted ${count}`);
        }
      }

      await client.query('COMMIT');
      console.log(`🎉 Done! Total inserted: ${count}`);

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Error:', err);
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('❌ File error:', err);
  }
};

importIFCT();