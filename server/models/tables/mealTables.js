import pool from '../../database/database.js';

export const mealTables = async () => {
  try {

    // ── INGREDIENTS ───────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR(150) UNIQUE NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        category     VARCHAR(100) NOT NULL,
        ifct_code VARCHAR(50),
        food_group VARCHAR(100)
      );
    `);

    // ── INGREDIENT NUTRITION (per 100g) ───────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredient_nutrition (
        id                   SERIAL PRIMARY KEY,
        ingredient_id        INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
        calories_per_100g    DECIMAL(10,2),
        protein_per_100g     DECIMAL(10,2),
        carbs_per_100g       DECIMAL(10,2),
        fat_per_100g         DECIMAL(10,2),
        fiber_per_100g       DECIMAL(10,2),
        iron_mg_per_100g     DECIMAL(10,2),
        calcium_mg_per_100g  DECIMAL(10,2),
        UNIQUE (ingredient_id)
      );
    `);

    // ── MEALS ─────────────────────────────────────────────────────────────────
    // ONE meal per school per date — no meal_type
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id          SERIAL PRIMARY KEY,
        school_id   INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name        VARCHAR(150) NOT NULL,
        served_date DATE NOT NULL,
        created_by  INT REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE (school_id, served_date)
      );
    `);

    // ── MEAL INGREDIENTS ──────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_ingredients (
        id            SERIAL PRIMARY KEY,
        meal_id       INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
        quantity_g    DECIMAL(10,2) NOT NULL CHECK (quantity_g > 0),
        UNIQUE (meal_id, ingredient_id)
      );
    `);

    // ── CLASS GROUPS ──────────────────────────────────────────────────────────
    // Groups are organisational labels only (G1-G4).
    // Nutrition distribution is dynamically computed from real student
    // age + gender RDA data — weight and rda_calories are no longer needed.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_groups (
        id          SERIAL PRIMARY KEY,
        school_id   INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        class_id    INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        group_label VARCHAR(5) NOT NULL CHECK (group_label IN ('G1','G2','G3','G4')),
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE (school_id, class_id)
      );
    `);

    // ── MEAL DISTRIBUTIONS ────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_distributions (
        id                   SERIAL PRIMARY KEY,
        meal_id              INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        group_label          VARCHAR(5) NOT NULL CHECK (group_label IN ('G1','G2','G3','G4')),
        student_count        INT NOT NULL DEFAULT 0 CHECK (student_count >= 0),
        weighted_load        DECIMAL(10,2) NOT NULL,
        calories_per_student DECIMAL(10,2),
        protein_per_student  DECIMAL(10,2),
        carbs_per_student    DECIMAL(10,2),
        fat_per_student      DECIMAL(10,2),
        fiber_per_student    DECIMAL(10,2),
        iron_per_student     DECIMAL(10,2),
        calcium_per_student  DECIMAL(10,2),
        UNIQUE (meal_id, group_label)
      );
    `);

    // ── MEAL NUTRITION SUMMARY ────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_nutrition_summary (
        id               SERIAL PRIMARY KEY,
        meal_id          INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE UNIQUE,
        total_calories   DECIMAL(10,2),
        total_protein    DECIMAL(10,2),
        total_carbs      DECIMAL(10,2),
        total_fat        DECIMAL(10,2),
        total_fiber      DECIMAL(10,2),
        total_iron       DECIMAL(10,2),
        total_calcium    DECIMAL(10,2),
        score            DECIMAL(5,2),
        score_label      VARCHAR(20) CHECK (score_label IN ('Poor','Average','Good','Balanced')),
        pm_poshan_status VARCHAR(20),
        computed_at      TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── MEAL SCORING CONFIG ───────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_scoring_config (
        id         SERIAL PRIMARY KEY,
        nutrient   VARCHAR(30) UNIQUE NOT NULL,
        weight     DECIMAL(4,3) NOT NULL,
        full_score INT NOT NULL DEFAULT 100
      );
    `);

    // ── NUTRITION SUGGESTIONS ─────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nutrition_suggestions (
        id         SERIAL PRIMARY KEY,
        nutrient   VARCHAR(30) NOT NULL,
        suggestion TEXT NOT NULL,
        category   VARCHAR(50),
        priority   INT NOT NULL DEFAULT 1
      );
    `);

    // ── INDEXES ───────────────────────────────────────────────────────────────
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_meals_school_date ON meals(school_id, served_date);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON meal_ingredients(meal_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ingredients_display ON ingredients(display_name);`);

    console.log('✅ Meal Tables are ready');

  } catch (err) {
    console.error('❌ Error creating meal tables:', err);
    throw err;
  }
};