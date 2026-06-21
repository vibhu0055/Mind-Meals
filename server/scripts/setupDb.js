// Run manually with : npm run dbsetup
// Creates tables (if they don't exist) and seeds RDA reference data

import dotenv from 'dotenv';
dotenv.config();

import pool from '../database/database.js';
import { createTables } from '../models/createTables.js';
import { seedRDA } from '../database/seedRDA.js';

const run = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');

    await createTables();
    console.log('✅ Tables initialized');

    await seedRDA();
    console.log('✅ RDA seeded');

    process.exit(0);
  } catch (err) {
    console.error('❌ DB setup failed:', err);
    process.exit(1);
  }
};

run();