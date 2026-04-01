import pool from './database.js';
import { createTables } from '../models/createTables.js';

export const connectdb = async () => {
  try {
    // Check DB connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Create tables if they don't exist
    await createTables();
    console.log('✅ Tables initialized');

  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    throw err; // important: let index.js handle failure
  }
};