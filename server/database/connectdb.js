import pool from './database.js';

export const connectdb = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    throw err; // important: let index.js handle failure
  }
};