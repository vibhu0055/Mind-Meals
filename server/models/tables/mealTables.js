import pool from '../../database/database.js';

export const mealTables = async () => {
  try {

    // ── INGREDIENTS ───────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR(150) UNIQUE NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        category     VARCHAR(100) NOT NULL
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

    // ── MEAL DISTRIBUTIONS ────────────────────────────────────────────────────
    // One row per meal — snapshot of student composition at distribution time.
    // total_rda_weight = sum of all students RDA calories on that day.
    // Used by individual student reports to compute personal shares.
    // Frozen once meal date passes (locked meals never recompute).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_distributions (
        id                   SERIAL PRIMARY KEY,
        meal_id              INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        -- School-wide snapshot
        total_students       INT NOT NULL DEFAULT 0,
        total_rda_weight     DECIMAL(12,2) NOT NULL DEFAULT 0,
        per_student_calories DECIMAL(10,2),
        per_student_protein  DECIMAL(10,2),
        per_student_carbs    DECIMAL(10,2),
        per_student_fat      DECIMAL(10,2),
        per_student_fiber    DECIMAL(10,2),
        per_student_iron     DECIMAL(10,2),
        per_student_calcium  DECIMAL(10,2),
        -- PM-POSHAN split: primary (Classes 1-5) and upper_primary (Classes 6-8)
        primary_student_count          INT DEFAULT 0,
        primary_rda_weight             DECIMAL(12,2) DEFAULT 0,
        primary_per_student_calories   DECIMAL(10,2),
        primary_per_student_protein    DECIMAL(10,2),
        upper_primary_student_count    INT DEFAULT 0,
        upper_primary_rda_weight       DECIMAL(12,2) DEFAULT 0,
        upper_primary_per_student_calories DECIMAL(10,2),
        upper_primary_per_student_protein  DECIMAL(10,2),
        computed_at          TIMESTAMP DEFAULT NOW(),
        UNIQUE (meal_id)
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
        per_student_calories  DECIMAL(10,2),
        per_student_protein   DECIMAL(10,2),
        per_student_carbs     DECIMAL(10,2),
        per_student_fat       DECIMAL(10,2),
        per_student_fiber     DECIMAL(10,2),
        per_student_iron      DECIMAL(10,2),
        per_student_calcium   DECIMAL(10,2),
        rda_calories     DECIMAL(10,2),
        rda_protein      DECIMAL(10,2),
        rda_carbs        DECIMAL(10,2),
        rda_fat          DECIMAL(10,2),
        rda_fiber        DECIMAL(10,2),
        rda_iron         DECIMAL(10,2),
        rda_calcium      DECIMAL(10,2),
        student_count    INT,
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