import pool from '../../database/database.js';

export const mealTables = async () => {
  try {

    // 10. INGREDIENTS (must come before meal_ingredients FK)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL,
        calories_kcal DECIMAL(7,2),
        protein_g DECIMAL(7,2),
        carbs_g DECIMAL(7,2),
        fat_g DECIMAL(7,2),
        fiber_g DECIMAL(7,2),
        iron_mg DECIMAL(7,2),
        calcium_mg DECIMAL(7,2),
        vitamin_a_mcg DECIMAL(7,2),
        vitamin_c_mg DECIMAL(7,2)
      );
    `);

    // 8. MEALS
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

    // 9. MEAL INGREDIENTS (links meal → ingredient with quantity)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_ingredients (
        id SERIAL PRIMARY KEY,
        meal_id INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
        quantity_g DECIMAL(7,2) NOT NULL,
        UNIQUE (meal_id, ingredient_id)
      );
    `);

    // 11. CLASS GROUPS
    // Maps each class to a nutrition group G1–G4
    // G1 (classes 1-2): weight 0.8, RDA 1350 kcal
    // G2 (classes 3-4): weight 0.9, RDA 1500 kcal
    // G3 (classes 5-6): weight 1.0, RDA 1700 kcal  ← base group
    // G4 (classes 7-8): weight 1.2, RDA 2000 kcal
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_groups (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        group_label VARCHAR(5) NOT NULL CHECK (group_label IN ('G1','G2','G3','G4')),
        weight DECIMAL(4,2) NOT NULL,
        rda_calories INT NOT NULL,
        UNIQUE (school_id, class_id)
      );
    `);

    // 12. MEAL DISTRIBUTIONS
    // Computed per-group nutrient allocation for a specific meal
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_distributions (
        id SERIAL PRIMARY KEY,
        meal_id INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        group_label VARCHAR(5) NOT NULL CHECK (group_label IN ('G1','G2','G3','G4')),
        student_count INT NOT NULL DEFAULT 0,
        weighted_load DECIMAL(8,2) NOT NULL,
        calories_per_student DECIMAL(8,2),
        protein_per_student DECIMAL(8,2),
        carbs_per_student DECIMAL(8,2),
        fat_per_student DECIMAL(8,2),
        fiber_per_student DECIMAL(8,2),
        iron_per_student DECIMAL(8,2),
        calcium_per_student DECIMAL(8,2),
        vitamin_a_per_student DECIMAL(8,2),
        vitamin_c_per_student DECIMAL(8,2),
        UNIQUE (meal_id, group_label)
      );
    `);

    console.log('✅ Meal Tables are ready');

  } catch (err) {
    console.error('❌ Error creating meal tables:', err);
    throw err;
  }
};