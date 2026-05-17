import pool from '../../database/database.js';

export const rdaTables = async () => {
  try {

    // ── TABLE 1: RDA reference ────────────────────────────────────────────────
    // Source: ICMR-NIN Recommended Dietary Allowances 2020
    // age_group: '6-9' | '9-12' | '13-15' | '16-17'
    // gender:    'male' | 'female' | 'other'
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rda_reference (
        id            SERIAL PRIMARY KEY,
        age_group     VARCHAR(10) NOT NULL,
        gender        VARCHAR(10) NOT NULL CHECK (gender IN ('male','female')),
        calories_kcal DECIMAL(8,2) NOT NULL,
        protein_g     DECIMAL(8,2) NOT NULL,
        carbs_g       DECIMAL(8,2),
        fat_g         DECIMAL(8,2),
        fiber_g       DECIMAL(8,2),
        iron_mg       DECIMAL(8,2) NOT NULL,
        calcium_mg    DECIMAL(8,2) NOT NULL,
        UNIQUE (age_group, gender)
      );
    `);

    // ── TABLE 2: Per-student nutrition reports ────────────────────────────────
    // One row per student per meal.
    // Stores intake received, personalised RDA, gaps, BMI context, and status.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_nutrition_reports (
        id          SERIAL PRIMARY KEY,
        student_id  INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        meal_id     INT NOT NULL REFERENCES meals(id)    ON DELETE CASCADE,

        -- student context at time of report
        age_group   VARCHAR(10),
        gender      VARCHAR(10),
        bmi_category VARCHAR(50),
        bmi_flag    BOOLEAN DEFAULT FALSE,

        -- what the student received from this meal
        received_calories DECIMAL(10,3),
        received_protein  DECIMAL(10,3),
        received_carbs    DECIMAL(10,3),
        received_fat      DECIMAL(10,3),
        received_fiber    DECIMAL(10,3),
        received_iron     DECIMAL(10,3),
        received_calcium  DECIMAL(10,3),

        -- personalised RDA (scaled to meal fraction)
        rda_calories DECIMAL(8,3),
        rda_protein  DECIMAL(8,3),
        rda_carbs    DECIMAL(8,3),
        rda_fat      DECIMAL(8,3),
        rda_fiber    DECIMAL(8,3),
        rda_iron     DECIMAL(8,3),
        rda_calcium  DECIMAL(8,3),

        -- gaps: received - rda  (negative = deficient)
        gap_calories DECIMAL(10,3),
        gap_protein  DECIMAL(10,3),
        gap_carbs    DECIMAL(10,3),
        gap_fat      DECIMAL(10,3),
        gap_fiber    DECIMAL(10,3),
        gap_iron     DECIMAL(10,3),
        gap_calcium  DECIMAL(10,3),

        -- overall calorie-based status
        overall_status VARCHAR(20) CHECK (overall_status IN ('adequate','deficient','excess')),

        generated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE (student_id, meal_id)
      );
    `);

    console.log('✅ RDA tables ready');

  } catch (err) {
    console.error('❌ Error creating RDA tables:', err);
    throw err;
  }
};