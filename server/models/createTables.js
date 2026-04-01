import { userTables } from './tables/userTables.js';


export const createTables = async () => {
  try {
    await userTables();

    console.log('✅ All tables created');

  } catch (err) {
    console.error('❌ Error creating tables:', err);
    throw err;
  }
};