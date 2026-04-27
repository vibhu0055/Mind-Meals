import { userTables } from './tables/userTables.js';
import {mealTables} from './tables/mealTables.js';
import { rdaTables  } from './tables/rdaTables.js';

export const createTables = async () => {
  try {
    await userTables();
    await mealTables();
    await rdaTables();

    console.log('✅ All tables created');

  } catch (err) {
    console.error('❌ Error creating tables:', err);
    throw err;
  }
};