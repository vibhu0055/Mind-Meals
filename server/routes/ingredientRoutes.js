import express from 'express';
import {
  addIngredient,
  getAllIngredients,
  getIngredientById,
  updateIngredient,
  deleteIngredient,
} from '../controllers/ingredientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Anyone authenticated can view ingredients
router.get('/',    protect(['school', 'teacher']), getAllIngredients);
router.get('/:id', protect(['school', 'teacher']), getIngredientById);

// Only school can add / update / delete ingredients
router.post('/',      protect(['school']), addIngredient);
router.patch('/:id',  protect(['school']), updateIngredient);
router.delete('/:id', protect(['school']), deleteIngredient);

export default router;