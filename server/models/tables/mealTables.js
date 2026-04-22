import pool from '../../database/database.js';

export const mealTables = async () => {
  try {

    // 🔥 INGREDIENTS (clean + usable for UI)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL,          -- raw IFCT name
        display_name VARCHAR(150) NOT NULL,         -- UI name (Brinjal, Rice, etc)
        category VARCHAR(100) NOT NULL              -- Cereal, Vegetable, Pulse
      );
    `);

    // 🔥 INGREDIENT NUTRITION (per 100g)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredient_nutrition (
        id SERIAL PRIMARY KEY,
        ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,

        calories_per_100g DECIMAL(10,2),
        protein_per_100g DECIMAL(10,2),
        carbs_per_100g DECIMAL(10,2),
        fat_per_100g DECIMAL(10,2),
        fiber_per_100g DECIMAL(10,2),

        iron_mg_per_100g DECIMAL(10,2),
        calcium_mg_per_100g DECIMAL(10,2),

        UNIQUE (ingredient_id)
      );
    `);

    // 🔥 MEALS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        meal_type VARCHAR(50) CHECK (meal_type IN ('breakfast','lunch','snack','dinner')),
        served_date DATE NOT NULL,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 🔥 MEAL INGREDIENTS (teacher input)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_ingredients (
        id SERIAL PRIMARY KEY,
        meal_id INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,

        quantity_g DECIMAL(10,2) NOT NULL CHECK (quantity_g > 0),

        UNIQUE (meal_id, ingredient_id)
      );
    `);

    // 🔥 CLASS GROUPS (your weighted logic base)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_groups (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

        group_label VARCHAR(5) NOT NULL CHECK (group_label IN ('G1','G2','G3','G4')),
        weight DECIMAL(4,2) NOT NULL CHECK (weight > 0),

        rda_calories INT NOT NULL CHECK (rda_calories > 0),

        UNIQUE (school_id, class_id)
      );
    `);

    // 🔥 MEAL DISTRIBUTIONS (final computed output)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_distributions (
        id SERIAL PRIMARY KEY,
        meal_id INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,

        group_label VARCHAR(5) NOT NULL CHECK (group_label IN ('G1','G2','G3','G4')),
        student_count INT NOT NULL DEFAULT 0 CHECK (student_count >= 0),

        weighted_load DECIMAL(10,2) NOT NULL,

        calories_per_student DECIMAL(10,2),
        protein_per_student DECIMAL(10,2),
        carbs_per_student DECIMAL(10,2),
        fat_per_student DECIMAL(10,2),
        fiber_per_student DECIMAL(10,2),
        iron_per_student DECIMAL(10,2),
        calcium_per_student DECIMAL(10,2),

        UNIQUE (meal_id, group_label)
      );
    `);


    console.log('✅ Meal Tables are ready');

  } catch (err) {
    console.error('❌ Error creating meal tables:', err);
    throw err;
  }
};