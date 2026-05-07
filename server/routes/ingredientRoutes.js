import express from 'express';
import {
  getAllIngredients,
  getCategories,
  getIngredientById,
  getIngredientNutrition,
} from '../controllers/ingredientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Category list (must be before /:id to avoid conflict)
router.get('/categories', protect(['school', 'teacher']), getCategories);

// List with search, filter, pagination
router.get('/', protect(['school', 'teacher']), getAllIngredients);

// Single ingredient with all nutrient details
router.get('/:id', protect(['school', 'teacher']), getIngredientById);

// Nutrient preview per 100g
router.get('/:id/nutrition', protect(['school', 'teacher']), getIngredientNutrition);

export default router;
