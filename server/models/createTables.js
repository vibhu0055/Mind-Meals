import { userTables } from './tables/userTables.js';
import {mealTables} from './tables/mealTables.js';


export const createTables = async () => {
  try {
    await userTables();
    await mealTables();

    console.log('✅ All tables created');

  } catch (err) {
    console.error('❌ Error creating tables:', err);
    throw err;
  }
};