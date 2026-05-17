// =============================================================
// DIRECT RDA SEED SCRIPT
// Run this if rda_reference table is empty after server restarts.
// node scripts/seedRDADirect.js
// =============================================================
import pool from '../database/database.js';

const RDA_DATA = [
  { age_group: '6-9',   gender: 'male',   calories_kcal: 1690, protein_g: 29.5, carbs_g: 230, fat_g: 37, fiber_g: 17, iron_mg: 9,  calcium_mg: 800  },
  { age_group: '6-9',   gender: 'female', calories_kcal: 1530, protein_g: 28.5, carbs_g: 210, fat_g: 34, fiber_g: 17, iron_mg: 9,  calcium_mg: 800  },
  { age_group: '9-12',  gender: 'male',   calories_kcal: 2190, protein_g: 40.0, carbs_g: 301, fat_g: 48, fiber_g: 22, iron_mg: 13, calcium_mg: 1200 },
  { age_group: '9-12',  gender: 'female', calories_kcal: 2010, protein_g: 46.0, carbs_g: 276, fat_g: 44, fiber_g: 22, iron_mg: 27, calcium_mg: 1200 },
  { age_group: '13-15', gender: 'male',   calories_kcal: 2750, protein_g: 54.0, carbs_g: 378, fat_g: 61, fiber_g: 28, iron_mg: 14, calcium_mg: 1200 },
  { age_group: '13-15', gender: 'female', calories_kcal: 2330, protein_g: 52.0, carbs_g: 319, fat_g: 52, fiber_g: 25, iron_mg: 27, calcium_mg: 1200 },
  { age_group: '16-17', gender: 'male',   calories_kcal: 3020, protein_g: 60.0, carbs_g: 415, fat_g: 67, fiber_g: 30, iron_mg: 14, calcium_mg: 1200 },
  { age_group: '16-17', gender: 'female', calories_kcal: 2440, protein_g: 55.0, carbs_g: 334, fat_g: 54, fiber_g: 26, iron_mg: 27, calcium_mg: 1200 },
];

const run = async () => {
  try {
    // 1. Check current table state
    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'rda_reference'
      ORDER BY ordinal_position
    `);
    console.log('Current rda_reference columns:', check.rows.map(r => r.column_name));

    const countRes = await pool.query('SELECT COUNT(*) FROM rda_reference');
    console.log('Current row count:', countRes.rows[0].count);

    // 2. If table has wrong schema (age_min/age_max instead of age_group), fix it
    const cols = check.rows.map(r => r.column_name);
    if (!cols.includes('age_group')) {
      console.log('⚠ Wrong schema detected — dropping and recreating...');
      await pool.query('DROP TABLE IF EXISTS rda_reference CASCADE');
      await pool.query(`
        CREATE TABLE rda_reference (
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
        )
      `);
      console.log('✅ Table recreated');
    }

    // 3. Insert all 12 rows
    let inserted = 0, skipped = 0;
    for (const row of RDA_DATA) {
      const result = await pool.query(
        `INSERT INTO rda_reference
           (age_group, gender, calories_kcal, protein_g, carbs_g,
            fat_g, fiber_g, iron_mg, calcium_mg)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (age_group, gender) DO UPDATE SET
           calories_kcal = EXCLUDED.calories_kcal,
           protein_g     = EXCLUDED.protein_g,
           carbs_g       = EXCLUDED.carbs_g,
           fat_g         = EXCLUDED.fat_g,
           fiber_g       = EXCLUDED.fiber_g,
           iron_mg       = EXCLUDED.iron_mg,
           calcium_mg    = EXCLUDED.calcium_mg
         RETURNING id`,
        [row.age_group, row.gender, row.calories_kcal, row.protein_g,
         row.carbs_g, row.fat_g, row.fiber_g, row.iron_mg, row.calcium_mg]
      );
      result.rows.length > 0 ? inserted++ : skipped++;
    }

    // 4. Verify
    const final = await pool.query('SELECT age_group, gender, iron_mg, calcium_mg FROM rda_reference ORDER BY age_group, gender');
    console.log(`\n✅ Done — ${inserted} inserted, ${skipped} skipped`);
    console.log('Rows now in rda_reference:');
    final.rows.forEach(r =>
      console.log(`  ${r.age_group} ${r.gender.padEnd(7)} iron=${r.iron_mg}mg calcium=${r.calcium_mg}mg`)
    );

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();