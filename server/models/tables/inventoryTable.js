// =============================================================
// INVENTORY + CACHE TABLES
// =============================================================

import pool from '../../database/database.js';

export const inventoryTable = async () => {

  // ── Inventory ─────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id            SERIAL PRIMARY KEY,
      school_id     INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      quantity_g    DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (quantity_g >= 0),
      updated_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE (school_id, ingredient_id)
    );
  `);

  // ── AI Suggestions Cache ───────────────────────────────────
  // One row per school per day.
  // Gemini is only called on a cache miss.
  // Invalidated automatically when inventory is updated.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meal_suggestions_cache (
      id            SERIAL PRIMARY KEY,
      school_id     INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      cache_date    DATE NOT NULL,
      suggestions   JSONB NOT NULL,
      student_count INT NOT NULL,
      rda_baseline  JSONB NOT NULL,
      generated_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE (school_id, cache_date)
    );
  `);

  console.log('✅ inventory + meal_suggestions_cache tables ready');
};