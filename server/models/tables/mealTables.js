import pool from '../../database/database.js';

export const mealTables = async () => {
  try {

    // 7. INGREDIENT
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredient (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(150) UNIQUE NOT NULL,
        calories_kcal DECIMAL(7,2) DEFAULT 0,
        protein_g     DECIMAL(7,2) DEFAULT 0,
        carbs_g       DECIMAL(7,2) DEFAULT 0,
        fat_g         DECIMAL(7,2) DEFAULT 0,
        fiber_g       DECIMAL(7,2) DEFAULT 0,
        iron_mg       DECIMAL(7,2) DEFAULT 0,
        calcium_mg    DECIMAL(7,2) DEFAULT 0,
        vitamin_a_mcg DECIMAL(7,2) DEFAULT 0,
        vitamin_c_mg  DECIMAL(7,2) DEFAULT 0,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    // 8. MEAL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal (
        id          SERIAL PRIMARY KEY,
        school_id   VARCHAR(100) NOT NULL REFERENCES admin(school_id) ON DELETE CASCADE,
        name        VARCHAR(150) NOT NULL,
        meal_type   VARCHAR(50) CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
        served_date DATE NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    // 9. MEAL_INGREDIENT (junction table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_ingredient (
        id            SERIAL PRIMARY KEY,
        meal_id       INT NOT NULL REFERENCES meal(id) ON DELETE CASCADE,
        ingredient_id INT NOT NULL REFERENCES ingredient(id) ON DELETE CASCADE,
        quantity_g    DECIMAL(7,2) NOT NULL,
        UNIQUE (meal_id, ingredient_id)
      );
    `);

    // 10. RECOMMENDATION
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recommendation (
        id               SERIAL PRIMARY KEY,
        student_id       INT NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        health_record_id INT REFERENCES health_record(id) ON DELETE SET NULL,
        category         VARCHAR(100),
        message          TEXT NOT NULL,
        generated_at     TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Meal Tables are ready');

  } catch (err) {
    console.error('❌ Error creating meal tables:', err);
    throw err;
  }
};