// =========================
// MEAL CONTROLLER
// =========================

import pool from '../database/database.js';
import {
  calculateMealNutrients,
  getStudentCountsByGroup,
  computeDistribution,
  saveDistribution,
} from '../services/mealService.js';

// ── CREATE MEAL ───────────────────────────────────────────────────────────────
// POST /api/meal/create   (school or teacher with can_manage_meals)
// Body: { name, meal_type, served_date }
export const createMeal = async (req, res) => {
  try {
    const { school_id, user_id, role } = req.user;
    const { name, meal_type, served_date } = req.body;

    if (!name || !meal_type || !served_date) {
      return res.status(400).json({ message: 'name, meal_type, and served_date are required' });
    }

    // If teacher: check they have can_manage_meals permission
    if (role === 'teacher') {
      const check = await pool.query(
        `SELECT can_manage_meals FROM users WHERE id = $1`,
        [user_id]
      );
      if (!check.rows[0]?.can_manage_meals) {
        return res.status(403).json({ message: 'You do not have meal management permission' });
      }
    }

    const created_by = role === 'teacher' ? user_id : null;

    const result = await pool.query(
      `INSERT INTO meals (school_id, name, meal_type, served_date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [school_id, name, meal_type, served_date, created_by]
    );

    return res.status(201).json({
      message: 'Meal created successfully',
      meal: result.rows[0],
    });

  } catch (err) {
    console.error('Create Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── ADD INGREDIENTS TO MEAL ───────────────────────────────────────────────────
// POST /api/meal/:meal_id/ingredients   (school or teacher with can_manage_meals)
// Body: { ingredients: [ { ingredient_id, quantity_g }, ... ] }
export const addMealIngredients = async (req, res) => {
  try {
    const { school_id, user_id, role } = req.user;
    const { meal_id } = req.params;
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'ingredients array is required' });
    }

    // Permission check for teacher
    if (role === 'teacher') {
      const check = await pool.query(
        `SELECT can_manage_meals FROM users WHERE id = $1`, [user_id]
      );
      if (!check.rows[0]?.can_manage_meals) {
        return res.status(403).json({ message: 'You do not have meal management permission' });
      }
    }

    // Verify meal belongs to this school
    const mealCheck = await pool.query(
      `SELECT * FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found in your school' });
    }

    // Validate each ingredient exists and insert
    const inserted = [];
    for (const item of ingredients) {
      const { ingredient_id, quantity_g } = item;

      if (!ingredient_id || !quantity_g || quantity_g <= 0) {
        return res.status(400).json({
          message: `Each ingredient must have ingredient_id and quantity_g > 0`,
        });
      }

      const ingCheck = await pool.query(
        `SELECT id FROM ingredients WHERE id = $1`, [ingredient_id]
      );
      if (ingCheck.rows.length === 0) {
        return res.status(404).json({ message: `Ingredient id ${ingredient_id} not found` });
      }

      const row = await pool.query(
        `INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity_g)
         VALUES ($1, $2, $3)
         ON CONFLICT (meal_id, ingredient_id) DO UPDATE SET quantity_g = EXCLUDED.quantity_g
         RETURNING *`,
        [meal_id, ingredient_id, quantity_g]
      );
      inserted.push(row.rows[0]);
    }

    return res.status(201).json({
      message: `${inserted.length} ingredient(s) added to meal`,
      meal_ingredients: inserted,
    });

  } catch (err) {
    console.error('Add Meal Ingredients Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── COMPUTE & SAVE DISTRIBUTION ───────────────────────────────────────────────
// POST /api/meal/:meal_id/distribute   (school or teacher with can_manage_meals)
// Triggers the weighted group distribution calculation and stores results.
export const distributeMeal = async (req, res) => {
  try {
    const { school_id, user_id, role } = req.user;
    const { meal_id } = req.params;

    // Permission check for teacher
    if (role === 'teacher') {
      const check = await pool.query(
        `SELECT can_manage_meals FROM users WHERE id = $1`, [user_id]
      );
      if (!check.rows[0]?.can_manage_meals) {
        return res.status(403).json({ message: 'You do not have meal management permission' });
      }
    }

    // Verify meal belongs to school
    const mealCheck = await pool.query(
      `SELECT * FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found in your school' });
    }

    // Check meal has at least one ingredient
    const ingCount = await pool.query(
      `SELECT COUNT(*) FROM meal_ingredients WHERE meal_id = $1`, [meal_id]
    );
    if (parseInt(ingCount.rows[0].count) === 0) {
      return res.status(400).json({ message: 'Add ingredients to the meal before distributing' });
    }

    // Check classes are mapped to groups
    const groupCheck = await pool.query(
      `SELECT COUNT(*) FROM class_groups WHERE school_id = $1`, [school_id]
    );
    if (parseInt(groupCheck.rows[0].count) === 0) {
      return res.status(400).json({
        message: 'No class-group mappings found. Assign classes to groups first via POST /api/class-group/assign',
      });
    }

    // Run distribution
    const totalNutrients    = await calculateMealNutrients(meal_id);
    const studentCounts     = await getStudentCountsByGroup(school_id);
    const distribution      = computeDistribution(totalNutrients, studentCounts);
    await saveDistribution(meal_id, distribution);

    return res.status(200).json({
      message: 'Meal distribution computed successfully',
      meal_id: parseInt(meal_id),
      total_nutrients: totalNutrients,
      student_counts: studentCounts,
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

// ── GET ALL MEALS FOR SCHOOL ──────────────────────────────────────────────────
// GET /api/meal/   (school or teacher)
// Optional query: ?date=2025-01-15  ?meal_type=lunch
export const getMeals = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { date, meal_type } = req.query;

    let query = `SELECT * FROM meals WHERE school_id = $1`;
    const params = [school_id];

    if (date) {
      params.push(date);
      query += ` AND served_date = $${params.length}`;
    }
    if (meal_type) {
      params.push(meal_type);
      query += ` AND meal_type = $${params.length}`;
    }

    query += ` ORDER BY served_date DESC, created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({ meals: result.rows });

  } catch (err) {
    console.error('Get Meals Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET SINGLE MEAL WITH INGREDIENTS ─────────────────────────────────────────
// GET /api/meal/:meal_id   (school or teacher)
export const getMealById = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id } = req.params;

    const mealResult = await pool.query(
      `SELECT * FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealResult.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const ingredientsResult = await pool.query(
      `SELECT mi.*, i.name AS ingredient_name,
              i.calories_kcal, i.protein_g, i.carbs_g, i.fat_g,
              i.fiber_g, i.iron_mg, i.calcium_mg, i.vitamin_a_mcg, i.vitamin_c_mg
       FROM meal_ingredients mi
       JOIN ingredients i ON mi.ingredient_id = i.id
       WHERE mi.meal_id = $1`,
      [meal_id]
    );

    return res.status(200).json({
      meal: mealResult.rows[0],
      ingredients: ingredientsResult.rows,
    });

  } catch (err) {
    console.error('Get Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET DISTRIBUTION RESULTS FOR A MEAL ──────────────────────────────────────
// GET /api/meal/:meal_id/distribution   (school or teacher)
export const getMealDistribution = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id } = req.params;

    const mealCheck = await pool.query(
      `SELECT * FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const result = await pool.query(
      `SELECT * FROM meal_distributions
       WHERE meal_id = $1
       ORDER BY group_label ASC`,
      [meal_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Distribution not yet computed. Call POST /api/meal/:meal_id/distribute first.',
      });
    }

    // Also return total nutrients for context
    const totals = await calculateMealNutrients(meal_id);

    return res.status(200).json({
      meal: mealCheck.rows[0],
      total_nutrients: totals,
      distribution: result.rows,
    });

  } catch (err) {
    console.error('Get Distribution Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── DELETE MEAL ───────────────────────────────────────────────────────────────
// DELETE /api/meal/:meal_id   (school only)
export const deleteMeal = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { meal_id } = req.params;

    const mealCheck = await pool.query(
      `SELECT * FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    // Cascade in DB handles meal_ingredients + meal_distributions
    await pool.query(`DELETE FROM meals WHERE id = $1`, [meal_id]);

    return res.status(200).json({ message: 'Meal deleted successfully' });

  } catch (err) {
    console.error('Delete Meal Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};