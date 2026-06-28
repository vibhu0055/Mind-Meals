// =============================================================
// AI MEAL SUGGESTION CONTROLLER
//
// GET  /api/meal/ai-suggestions
//   → Cache-first. Returns cached result if today's exists.
//     Only calls Gemini on a cache miss.
//     Pass ?refresh=true to force a new Gemini call.
//
// POST /api/meal/ai-suggestions/confirm
//   → Teacher picks one suggestion; auto-creates today's meal.
// =============================================================

import pool from '../database/database.js';
import { generateMealSuggestions } from '../services/aimealservice.js';
import {
  calculateMealNutrients,
  computeDistributionByRda,
  saveDistribution,
} from '../services/mealService.js';

// =============================================================
// GET SUGGESTIONS   GET /api/meal/ai-suggestions
// ?refresh=true  → bypass cache, call Gemini fresh
// =============================================================
export const getAiMealSuggestions = async (req, res) => {
  try {
    const { school_id } = req.user;
    const forceRefresh = req.query.refresh === 'true';

    const data = await generateMealSuggestions(school_id, forceRefresh);

    return res.status(200).json({
      message: data.from_cache
        ? 'Returning cached suggestions for today'
        : 'AI meal suggestions generated successfully',
      ...data,
    });

  } catch (err) {
    console.error('AI Meal Suggestions Error:', err);

    if (
      err.message.includes('No ingredients') ||
      err.message.includes('No students') ||
      err.message.includes('GEMINI_API_KEY')
    ) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Failed to generate suggestions. Try again.' });
  }
};

// =============================================================
// CONFIRM SUGGESTION   POST /api/meal/ai-suggestions/confirm
//
// Body: {
//   meal_name:   string,
//   ingredients: [{ ingredient_id, quantity_g }]
// }
// =============================================================
export const confirmAiMealSuggestion = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { school_id, user_id, role } = req.user;
    const { meal_name, ingredients } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'ingredients array is required' });
    }

    // Ensure no meal exists for today
    const existing = await client.query(
      `SELECT id FROM meals WHERE school_id = $1 AND served_date = CURRENT_DATE`,
      [school_id]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: 'A meal already exists for today. Delete it first or edit it directly.',
        existing_meal_id: existing.rows[0].id,
      });
    }

    const created_by = role === 'teacher' ? user_id : null;
    const name = meal_name || 'AI Suggested Meal';

    const mealRes = await client.query(
      `INSERT INTO meals (school_id, name, served_date, created_by)
       VALUES ($1, $2, CURRENT_DATE, $3)
       RETURNING *`,
      [school_id, name, created_by]
    );
    const meal = mealRes.rows[0];

    const inserted = [];
    for (const item of ingredients) {
      const { ingredient_id, quantity_g } = item;

      if (!ingredient_id || !quantity_g || quantity_g <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: 'Each ingredient needs ingredient_id and quantity_g > 0',
        });
      }
      if (quantity_g > 50000) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `quantity_g ${quantity_g} exceeds max (50,000g)`,
        });
      }

      const ingCheck = await client.query(
        `SELECT id FROM ingredients WHERE id = $1`, [ingredient_id]
      );
      if (ingCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Ingredient ${ingredient_id} not found` });
      }

      const row = await client.query(
        `INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity_g)
         VALUES ($1, $2, $3) RETURNING *`,
        [meal.id, ingredient_id, quantity_g]
      );
      inserted.push(row.rows[0]);
    }

    await client.query('COMMIT');

    // Auto-compute distribution (non-fatal)
    try {
      const studentCount = await pool.query(
        `SELECT COUNT(*) FROM students WHERE school_id = $1`, [school_id]
      );
      if (parseInt(studentCount.rows[0].count) > 0) {
        const totalNutrients = await calculateMealNutrients(meal.id);
        const distribution   = await computeDistributionByRda(totalNutrients, school_id);
        await saveDistribution(meal.id, distribution);
      }
    } catch (distErr) {
      console.warn('Auto-distribution warning after AI confirm:', distErr.message);
    }

    return res.status(201).json({
      message: `Meal "${name}" created with ${inserted.length} ingredient(s). Ready to serve!`,
      meal,
      ingredients_added: inserted.length,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A meal already exists for today.' });
    }
    console.error('Confirm AI Suggestion Error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};