// =============================================================
// ONE-TIME MIGRATION
// Adds display_name and category columns to ingredients table
// if they don't already exist.
//
// Run ONCE:  node scripts/migrateIngredients.js
// =============================================================
import pool from '../database/database.js';

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Checking ingredients table columns...');

    await client.query(`
      ALTER TABLE ingredients
        ADD COLUMN IF NOT EXISTS display_name VARCHAR(150),
        ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    `);

    // Backfill existing rows that have NULL in the new columns
    await client.query(`
      UPDATE ingredients
      SET display_name = name,
          category = 'Other'
      WHERE display_name IS NULL;
    `);

    console.log('✅ Migration complete — display_name and category columns ready');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();