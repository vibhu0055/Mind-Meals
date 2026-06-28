// =============================================================
// MEAL CONTROLLER
// One meal per school per day. Edit/delete restricted to today.
// Auto-recalculates distribution + summary on ingredient changes.
// Inventory is deducted/restored on every ingredient change.
// =============================================================

import pool from '../database/database.js';
import {
  calculateMealNutrients,
  computeDistributionByRda,
  saveDistribution,
  computeMealSummary,
} from '../services/mealService.js';
import {
  deductFromInventory,
  restoreToInventory,
  applyInventoryDelta,
  restoreAllMealIngredients,
} from '../services/inventoryService.js';

// ── Helper: is served_date today? ────────────────────────────
const isToday = async (served_date, db) => {
  const d = served_date instanceof Date ? served_date : new Date(served_date);
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  const res = await db.query(
    `SELECT TO_CHAR((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS today`
  );
  return dateStr === res.rows[0].today;
};

// ── Helper: is meal locked? (served_date is in the past) ─────
const isMealLocked = async (served_date, db) => {
  const res = await db.query(
    `SELECT ($1::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date) AS is_locked`,
    [served_date]
  );
  return res.rows[0].is_locked;
};

// =============================================================
// CREATE MEAL  POST /api/meal/create
// =============================================================
export const createMeal = async (req, res) => {
  try {
    const { school_id, user_id, role } = req.user;
    const { name, served_date } = req.body;

    if (!name || !served_date) {
      return res.status(400).json({ message: 'name and served_date are required' });
    }

    const pastCheck = await pool.query(
      `SELECT ($1::date < CURRENT_DATE) AS is_past`, [served_date]
    );
    if (pastCheck.rows[0].is_past) {
      return res.status(400).json({ message: 'Cannot create a meal for a past date' });
    }

    const created_by = role === 'teacher' ? user_id : null;

    const result = await pool.query(
      `INSERT INTO meals (school_id, name, served_date, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [school_id, name, served_date, created_by]
    );

    return res.status(201).json({ message: 'Meal created successfully', meal: result.rows[0] });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A meal already exists for this school on that date' });
    }
    console.error('Create Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// UPDATE MEAL  PUT /api/meal/:meal_id
// (name only — ingredients have separate endpoints)
// =============================================================
export const updateMeal = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id }   = req.params;
    const { name }      = req.body;

    if (!name) return res.status(400).json({ message: 'name is required' });

    const mealCheck = await pool.query(
      `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
       FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found in your school' });
    }
    if (!(await isToday(mealCheck.rows[0].served_date, pool))) {
      return res.status(403).json({ message: 'Only today\'s meal can be edited' });
    }

    const result = await pool.query(
      `UPDATE meals SET name = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at`,
      [name, meal_id]
    );

    return res.status(200).json({ message: 'Meal updated', meal: result.rows[0] });

  } catch (err) {
    console.error('Update Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// DELETE MEAL  DELETE /api/meal/:meal_id
// Restores all ingredient quantities to inventory before delete.
// =============================================================
export const deleteMeal = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { school_id } = req.user;
    const { meal_id }   = req.params;

    const mealCheck = await client.query(
      `SELECT id, school_id, served_date FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Meal not found in your school' });
    }
    if (!(await isToday(mealCheck.rows[0].served_date, client))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Only today\'s meal can be deleted' });
    }

    // Restore all ingredients back to inventory before deleting
    await restoreAllMealIngredients(client, school_id, meal_id);

    await client.query(`DELETE FROM meals WHERE id = $1`, [meal_id]);

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Meal deleted. Inventory restored.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// =============================================================
// GET TODAY'S MEAL  GET /api/meal/today
// =============================================================
export const getTodaysMeal = async (req, res) => {
  try {
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
       FROM meals WHERE school_id = $1 AND served_date = CURRENT_DATE`,
      [school_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No meal found for today' });
    }

    const meal = result.rows[0];
    const ingredients = await pool.query(
      `SELECT mi.*, i.display_name, i.category,
              n.calories_per_100g, n.protein_per_100g, n.carbs_per_100g,
              n.fat_per_100g, n.fiber_per_100g, n.iron_mg_per_100g, n.calcium_mg_per_100g
       FROM meal_ingredients mi
       JOIN ingredients i ON mi.ingredient_id = i.id
       JOIN ingredient_nutrition n ON i.id = n.ingredient_id
       WHERE mi.meal_id = $1`,
      [meal.id]
    );

    return res.status(200).json({ meal, ingredients: ingredients.rows });

  } catch (err) {
    console.error('Get Today Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET ALL MEALS  GET /api/meal/
// =============================================================
export const getMeals = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { date }      = req.query;

    let query = `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
                 FROM meals WHERE school_id = $1`;
    const params = [school_id];

    if (date) {
      params.push(date);
      query += ` AND served_date = $${params.length}`;
    }
    query += ` ORDER BY served_date DESC, created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({ meals: result.rows });

  } catch (err) {
    console.error('Get Meals Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET SINGLE MEAL  GET /api/meal/:meal_id
// =============================================================
export const getMealById = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id }   = req.params;

    const mealResult = await pool.query(
      `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
       FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealResult.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const ingredients = await pool.query(
      `SELECT mi.*, i.display_name, i.category,
              n.calories_per_100g, n.protein_per_100g, n.carbs_per_100g,
              n.fat_per_100g, n.fiber_per_100g, n.iron_mg_per_100g, n.calcium_mg_per_100g
       FROM meal_ingredients mi
       JOIN ingredients i ON mi.ingredient_id = i.id
       JOIN ingredient_nutrition n ON i.id = n.ingredient_id
       WHERE mi.meal_id = $1`,
      [meal_id]
    );

    return res.status(200).json({ meal: mealResult.rows[0], ingredients: ingredients.rows });

  } catch (err) {
    console.error('Get Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// ADD / UPDATE INGREDIENTS  POST /api/meal/:meal_id/ingredients
// New ingredient → deduct full qty from inventory.
// Existing ingredient → apply delta (new - old) only.
// =============================================================
export const addMealIngredients = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { school_id } = req.user;
    const { meal_id }   = req.params;
    const { ingredients } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'ingredients array is required' });
    }

    const mealCheck = await client.query(
      `SELECT id, school_id, served_date FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Meal not found in your school' });
    }
    if (!(await isToday(mealCheck.rows[0].served_date, pool))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Ingredients can only be added to today\'s meal' });
    }

    const inserted = [];

    for (const item of ingredients) {
      const { ingredient_id, quantity_g } = item;

      if (!ingredient_id || !quantity_g || quantity_g <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Each ingredient must have ingredient_id and quantity_g > 0' });
      }
      if (quantity_g > 50000) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Quantity ${quantity_g}g seems unrealistic (max 50,000g)` });
      }

      const ingCheck = await client.query(
        `SELECT id FROM ingredients WHERE id = $1`, [ingredient_id]
      );
      if (ingCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Ingredient id ${ingredient_id} not found` });
      }

      // Check if already in meal (update vs insert)
      const existing = await client.query(
        `SELECT quantity_g FROM meal_ingredients WHERE meal_id = $1 AND ingredient_id = $2`,
        [meal_id, ingredient_id]
      );

      if (existing.rows.length > 0) {
        // Update — apply only the delta to inventory
        const oldQty = parseFloat(existing.rows[0].quantity_g);
        await applyInventoryDelta(client, school_id, ingredient_id, oldQty, quantity_g);
      } else {
        // Insert — deduct full quantity
        await deductFromInventory(client, school_id, ingredient_id, quantity_g);
      }

      const row = await client.query(
        `INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity_g)
         VALUES ($1, $2, $3)
         ON CONFLICT (meal_id, ingredient_id)
         DO UPDATE SET quantity_g = EXCLUDED.quantity_g
         RETURNING *`,
        [meal_id, ingredient_id, quantity_g]
      );
      inserted.push(row.rows[0]);
    }

    await client.query(`UPDATE meals SET updated_at = NOW() WHERE id = $1`, [meal_id]);
    await client.query('COMMIT');

    // Auto-recalculate distribution (outside transaction — non-fatal)
    try {
      const locked = await isMealLocked(mealCheck.rows[0].served_date, pool);
      if (!locked) {
        const studentCount = await pool.query(
          `SELECT COUNT(*) FROM students WHERE school_id = $1`, [school_id]
        );
        if (parseInt(studentCount.rows[0].count) > 0) {
          const totalNutrients = await calculateMealNutrients(meal_id);
          const distribution   = await computeDistributionByRda(totalNutrients, school_id);
          await saveDistribution(meal_id, distribution);
        }
      }
    } catch (recalcErr) {
      console.warn('Auto-recalc warning:', recalcErr.message);
    }

    return res.status(201).json({
      message: `${inserted.length} ingredient(s) saved. Inventory updated.`,
      meal_ingredients: inserted,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message.includes('Insufficient stock') || err.message.includes('not in your inventory')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Add Meal Ingredients Error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// =============================================================
// DISTRIBUTE MEAL  POST /api/meal/:meal_id/distribute
// @deprecated — kept for manual re-runs / debugging only.
// =============================================================
export const distributeMeal = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id }   = req.params;

    const mealCheck = await pool.query(
      `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
       FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found in your school' });
    }

    const ingCount = await pool.query(
      `SELECT COUNT(*) FROM meal_ingredients WHERE meal_id = $1`, [meal_id]
    );
    if (parseInt(ingCount.rows[0].count) === 0) {
      return res.status(400).json({ message: 'Add ingredients to the meal before distributing' });
    }

    const studentCheck = await pool.query(
      `SELECT COUNT(*) FROM students WHERE school_id = $1`, [school_id]
    );
    if (parseInt(studentCheck.rows[0].count) === 0) {
      return res.status(400).json({ message: 'No students found. Add students first.' });
    }

    const locked = await isMealLocked(mealCheck.rows[0].served_date, pool);
    if (locked) {
      return res.status(403).json({
        message: 'This meal is locked (past date). Distribution cannot be recomputed.',
      });
    }

    const totalNutrients = await calculateMealNutrients(meal_id);
    const distribution   = await computeDistributionByRda(totalNutrients, school_id);
    await saveDistribution(meal_id, distribution);

    return res.status(200).json({
      message:         'Meal distribution computed successfully',
      deprecated:      'Distribution runs automatically on ingredient updates.',
      meal_id:         parseInt(meal_id),
      total_nutrients: totalNutrients,
      distribution,
    });

  } catch (err) {
    if (err.message.includes('No students found')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Distribute Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET DISTRIBUTION  GET /api/meal/:meal_id/distribution
// =============================================================
export const getMealDistribution = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id }   = req.params;

    const mealCheck = await pool.query(
      `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
       FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const result = await pool.query(
      `SELECT * FROM meal_distributions WHERE meal_id = $1`, [meal_id]
    );

    if (result.rows.length === 0) {
      const locked = await isMealLocked(mealCheck.rows[0].served_date, pool);
      if (locked) {
        return res.status(400).json({ message: 'No saved distribution and meal is now locked.' });
      }
      const ingCount = await pool.query(
        `SELECT COUNT(*) FROM meal_ingredients WHERE meal_id = $1`, [meal_id]
      );
      const studentCount = await pool.query(
        `SELECT COUNT(*) FROM students WHERE school_id = $1`, [school_id]
      );
      if (parseInt(ingCount.rows[0].count) === 0) {
        return res.status(400).json({ message: 'No ingredients added to this meal yet.' });
      }
      if (parseInt(studentCount.rows[0].count) === 0) {
        return res.status(400).json({ message: 'No students found for this school.' });
      }
      const totalsNow = await calculateMealNutrients(meal_id);
      const distNow   = await computeDistributionByRda(totalsNow, school_id);
      await saveDistribution(meal_id, distNow);
      return res.status(200).json({
        meal:            mealCheck.rows[0],
        total_nutrients: totalsNow,
        distribution:    distNow,
      });
    }

    const totals = await calculateMealNutrients(meal_id);
    return res.status(200).json({
      meal:            mealCheck.rows[0],
      total_nutrients: totals,
      distribution:    result.rows,
    });

  } catch (err) {
    console.error('Get Distribution Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET MEAL NUTRITION SUMMARY  GET /api/meal/:meal_id/summary
// =============================================================
export const getMealSummary = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id }   = req.params;

    const mealCheck = await pool.query(
      `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
       FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const ingCount = await pool.query(
      `SELECT COUNT(*) FROM meal_ingredients WHERE meal_id = $1`, [meal_id]
    );
    if (parseInt(ingCount.rows[0].count) === 0) {
      return res.status(400).json({ message: 'No ingredients added to this meal yet' });
    }

    const summary = await computeMealSummary(parseInt(meal_id));
    return res.status(200).json({ meal: mealCheck.rows[0], summary });

  } catch (err) {
    console.error('Get Meal Summary Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET MEAL SCORE  GET /api/meal/:meal_id/score
// =============================================================
export const getMealScore = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id }   = req.params;

    const mealCheck = await pool.query(
      `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
       FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const cached = await pool.query(
      `SELECT score, score_label, computed_at FROM meal_nutrition_summary WHERE meal_id = $1`,
      [meal_id]
    );
    if (cached.rows.length > 0) {
      return res.status(200).json({
        meal_id:     parseInt(meal_id),
        score:       parseFloat(cached.rows[0].score),
        label:       cached.rows[0].score_label,
        computed_at: cached.rows[0].computed_at,
      });
    }

    const summary = await computeMealSummary(parseInt(meal_id));
    return res.status(200).json({
      meal_id: parseInt(meal_id),
      score:   summary.score,
      label:   summary.score_label,
    });

  } catch (err) {
    console.error('Get Meal Score Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET MEAL SUGGESTIONS  GET /api/meal/:meal_id/suggestions
// =============================================================
export const getMealSuggestions = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id }   = req.params;

    const mealCheck = await pool.query(
      `SELECT id, school_id, name, served_date::text AS served_date, created_by, created_at, updated_at
       FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const summary = await computeMealSummary(parseInt(meal_id));
    return res.status(200).json({
      meal_id:      parseInt(meal_id),
      score:        summary.score,
      score_label:  summary.score_label,
      deficiencies: summary.deficiencies,
      suggestions:  summary.suggestions,
      explanation:  summary.explanation,
    });

  } catch (err) {
    console.error('Get Meal Suggestions Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// UPDATE A SINGLE INGREDIENT  PUT /api/meal/:meal_id/ingredients/:ingredient_id
// Applies inventory delta (new qty - old qty) only.
// =============================================================
export const updateMealIngredient = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { school_id } = req.user;
    const { meal_id, ingredient_id } = req.params;
    const { quantity_g } = req.body;

    if (!quantity_g || quantity_g <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'quantity_g must be a positive number' });
    }
    if (quantity_g > 50000) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'quantity_g seems unrealistic (max 50,000g)' });
    }

    const mealCheck = await client.query(
      `SELECT id, school_id, served_date FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Meal not found in your school' });
    }
    if (!(await isToday(mealCheck.rows[0].served_date, pool))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Ingredients can only be edited on today\'s meal' });
    }

    const rowCheck = await client.query(
      `SELECT quantity_g FROM meal_ingredients WHERE meal_id = $1 AND ingredient_id = $2`,
      [meal_id, ingredient_id]
    );
    if (rowCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ingredient not found in this meal' });
    }

    const oldQty = parseFloat(rowCheck.rows[0].quantity_g);

    // Apply only the difference to inventory
    await applyInventoryDelta(client, school_id, ingredient_id, oldQty, quantity_g);

    const result = await client.query(
      `UPDATE meal_ingredients SET quantity_g = $1
       WHERE meal_id = $2 AND ingredient_id = $3 RETURNING *`,
      [quantity_g, meal_id, ingredient_id]
    );

    await client.query(`UPDATE meals SET updated_at = NOW() WHERE id = $1`, [meal_id]);
    await client.query('COMMIT');

    // Auto-recalculate
    try {
      const studentCount = await pool.query(
        `SELECT COUNT(*) FROM students WHERE school_id = $1`, [school_id]
      );
      if (parseInt(studentCount.rows[0].count) > 0) {
        const totalNutrients = await calculateMealNutrients(meal_id);
        const distribution   = await computeDistributionByRda(totalNutrients, school_id);
        await saveDistribution(meal_id, distribution);
      }
    } catch (recalcErr) {
      console.warn('Auto-recalc warning:', recalcErr.message);
    }

    return res.status(200).json({
      message: 'Ingredient updated. Inventory adjusted.',
      meal_ingredient: result.rows[0],
    });

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message.includes('Insufficient stock') || err.message.includes('not in your inventory')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Update Meal Ingredient Error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// =============================================================
// DELETE SINGLE INGREDIENT  DELETE /api/meal/:meal_id/ingredients/:ingredient_id
// Restores that ingredient's quantity to inventory.
// =============================================================
export const deleteMealIngredient = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { school_id } = req.user;
    const { meal_id, ingredient_id } = req.params;

    const mealCheck = await client.query(
      `SELECT id, school_id, served_date FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Meal not found in your school' });
    }
    if (!(await isToday(mealCheck.rows[0].served_date, pool))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Ingredients can only be removed from today\'s meal' });
    }

    const result = await client.query(
      `DELETE FROM meal_ingredients WHERE meal_id = $1 AND ingredient_id = $2 RETURNING *`,
      [meal_id, ingredient_id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ingredient not found in this meal' });
    }

    // Restore quantity back to inventory
    await restoreToInventory(
      client, school_id, ingredient_id,
      parseFloat(result.rows[0].quantity_g)
    );

    await client.query(`UPDATE meals SET updated_at = NOW() WHERE id = $1`, [meal_id]);
    await client.query('COMMIT');

    // Auto-recalculate
    try {
      const remaining = await pool.query(
        `SELECT COUNT(*) FROM meal_ingredients WHERE meal_id = $1`, [meal_id]
      );
      if (parseInt(remaining.rows[0].count) > 0) {
        const studentCount = await pool.query(
          `SELECT COUNT(*) FROM students WHERE school_id = $1`, [school_id]
        );
        if (parseInt(studentCount.rows[0].count) > 0) {
          const totalNutrients = await calculateMealNutrients(meal_id);
          const distribution   = await computeDistributionByRda(totalNutrients, school_id);
          await saveDistribution(meal_id, distribution);
        }
      } else {
        await pool.query(`DELETE FROM meal_distributions WHERE meal_id = $1`, [meal_id]);
        await pool.query(`DELETE FROM meal_nutrition_summary WHERE meal_id = $1`, [meal_id]);
      }
    } catch (recalcErr) {
      console.warn('Auto-recalc warning:', recalcErr.message);
    }

    return res.status(200).json({ message: 'Ingredient removed. Inventory restored.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete Meal Ingredient Error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// =============================================================
// CLEAR ALL INGREDIENTS  DELETE /api/meal/:meal_id/ingredients
// Restores all ingredient quantities to inventory before clearing.
// =============================================================
export const clearMealIngredients = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { school_id } = req.user;
    const { meal_id }   = req.params;

    const mealCheck = await client.query(
      `SELECT id, school_id, served_date FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Meal not found in your school' });
    }
    if (!(await isToday(mealCheck.rows[0].served_date, pool))) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Ingredients can only be cleared from today\'s meal' });
    }

    // Restore all quantities before clearing
    await restoreAllMealIngredients(client, school_id, meal_id);

    const deleted = await client.query(
      `DELETE FROM meal_ingredients WHERE meal_id = $1 RETURNING id`, [meal_id]
    );

    await client.query(`DELETE FROM meal_distributions WHERE meal_id = $1`, [meal_id]);
    await client.query(`DELETE FROM meal_nutrition_summary WHERE meal_id = $1`, [meal_id]);
    await client.query(`UPDATE meals SET updated_at = NOW() WHERE id = $1`, [meal_id]);

    await client.query('COMMIT');
    return res.status(200).json({
      message: `${deleted.rowCount} ingredient(s) cleared. Inventory fully restored.`,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Clear Meal Ingredients Error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};