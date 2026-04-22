import express from 'express';
import pool from '../database/database.js';

import {
  createMeal,
  addMealIngredients,
  distributeMeal,
  getMeals,
  getMealById,
  getMealDistribution,
  deleteMeal,
} from '../controllers/mealController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── PERMISSION MIDDLEWARE ────────────────────────────────
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

// ── LIST / CREATE ────────────────────────────────────────
router.get('/', protect(['school', 'teacher']), getMeals);

router.post(
  '/create',
  protect(['school', 'teacher']),
  requireMealPermission,
  createMeal
);

// ── SINGLE MEAL ─────────────────────────────────────────
router.get('/:meal_id', protect(['school', 'teacher']), getMealById);

router.delete('/:meal_id', protect(['school']), deleteMeal);

// ── INGREDIENTS ─────────────────────────────────────────
router.post(
  '/:meal_id/ingredients',
  protect(['school', 'teacher']),
  requireMealPermission,
  addMealIngredients
);

// ── DISTRIBUTION ────────────────────────────────────────
router.post(
  '/:meal_id/distribute',
  protect(['school', 'teacher']),
  requireMealPermission,
  distributeMeal
);

router.get(
  '/:meal_id/distribution',
  protect(['school', 'teacher']),
  getMealDistribution
);

export default router;