import express from 'express';
import pool from '../database/database.js';

import {
  createMeal,
  updateMeal,
  deleteMeal,
  getTodaysMeal,
  getMeals,
  getMealById,
  addMealIngredients,
  distributeMeal,
  getMealDistribution,
  getMealSummary,
  getMealScore,
  getMealSuggestions,
} from '../controllers/mealController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Permission middleware ─────────────────────────────────────
const requireMealPermission = async (req, res, next) => {
  try {
    if (req.user.role === 'school') return next();
    const { rows } = await pool.query(
      'SELECT can_manage_meals FROM users WHERE id = $1',
      [req.user.user_id]
    );
    if (!rows[0]?.can_manage_meals) {
      return res.status(403).json({ message: 'No meal permission' });
    }
    next();
  } catch (err) {
    console.error('Meal Permission Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── Today's meal (must be before /:meal_id) ──────────────────
router.get('/today', protect(['school', 'teacher']), getTodaysMeal);

// ── List / Create ─────────────────────────────────────────────
router.get('/', protect(['school', 'teacher']), getMeals);

router.post(
  '/create',
  protect(['school', 'teacher']),
  requireMealPermission,
  createMeal
);

// ── Single meal CRUD ──────────────────────────────────────────
router.get('/:meal_id', protect(['school', 'teacher']), getMealById);

router.put(
  '/:meal_id',
  protect(['school', 'teacher']),
  requireMealPermission,
  updateMeal
);

router.delete(
  '/:meal_id',
  protect(['school']),
  deleteMeal
);

// ── Ingredients ───────────────────────────────────────────────
router.post(
  '/:meal_id/ingredients',
  protect(['school', 'teacher']),
  requireMealPermission,
  addMealIngredients
);

// ── Distribution ──────────────────────────────────────────────
router.post(
  '/:meal_id/distribute',
  protect(['school', 'teacher']),
  requireMealPermission,
  distributeMeal
);
router.get('/:meal_id/distribution', protect(['school', 'teacher']), getMealDistribution);

// ── Nutrition summary, score, suggestions ─────────────────────
router.get('/:meal_id/summary',     protect(['school', 'teacher']), getMealSummary);
router.get('/:meal_id/score',       protect(['school', 'teacher']), getMealScore);
router.get('/:meal_id/suggestions', protect(['school', 'teacher']), getMealSuggestions);

export default router;
