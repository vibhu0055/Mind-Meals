import express from 'express';
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

// ── LIST / CREATE ────────────────────────────────────────────────────────────
router.get('/',    protect(['school', 'teacher']), getMeals);
router.post('/create', protect(['school', 'teacher']), createMeal);

// ── SINGLE MEAL ──────────────────────────────────────────────────────────────
router.get('/:meal_id',    protect(['school', 'teacher']), getMealById);
router.delete('/:meal_id', protect(['school']),            deleteMeal);

// ── INGREDIENTS ──────────────────────────────────────────────────────────────
router.post('/:meal_id/ingredients', protect(['school', 'teacher']), addMealIngredients);

// ── DISTRIBUTION ─────────────────────────────────────────────────────────────
router.post('/:meal_id/distribute',    protect(['school', 'teacher']), distributeMeal);
router.get('/:meal_id/distribution',   protect(['school', 'teacher']), getMealDistribution);

export default router;