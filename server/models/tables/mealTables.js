import pool from '../../database/database.js';

export const mealTables = async () => {
  try {

       // 8. MEALS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        meal_type VARCHAR(50) CHECK (meal_type IN ('breakfast','lunch','snack','dinner')),
        served_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 9. MEAL INGREDIENTS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_ingredients (
        id SERIAL PRIMARY KEY,
        meal_id INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        ingredient_name VARCHAR(150) NOT NULL,
        quantity_g DECIMAL(7,2)
      );
    `);

    // 10. INGREDIENTS
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
    console.log('✅ Meal Tables are ready');

  } catch (err) {
    console.error('❌ Error creating meal tables:', err);
    throw err;
  }
};