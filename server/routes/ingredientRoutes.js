import express from 'express';
import {
  getAllIngredients,
  getIngredientById,
} from '../controllers/ingredientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Anyone authenticated can view ingredients
router.get('/',    protect(['school', 'teacher']), getAllIngredients);
router.get('/:id', protect(['school', 'teacher']), getIngredientById);


export default router;