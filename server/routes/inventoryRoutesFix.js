// =============================================================
// INVENTORY ROUTES   /api/inventory
// =============================================================

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  upsertInventory,
  getInventory,
  deleteInventoryItem,
} from '../controllers/inventoryController.js';

const router = express.Router();

// View current stock
router.get('/', protect(['school', 'teacher']), getInventory);

// Add or update stock quantities
router.post('/', protect(['school', 'teacher']), upsertInventory);

// Remove an ingredient from inventory
router.delete('/:ingredient_id', protect(['school', 'teacher']), deleteInventoryItem);

export default router;