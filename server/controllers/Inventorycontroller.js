// =============================================================
// INVENTORY CONTROLLER
// CHANGE 1: Cache invalidation wired in — whenever stock
// changes, today's cached suggestions are deleted so the next
// GET /api/meal/ai-suggestions triggers a fresh Gemini call.
// =============================================================

import pool from '../database/database.js';
import { invalidateSuggestionsCache } from '../services/aiMealService.js';

// =============================================================
// UPSERT INVENTORY   POST /api/inventory
// =============================================================
export const upsertInventory = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' });
    }

    const upserted = [];

    for (const item of items) {
      const { ingredient_id, quantity_g } = item;

      if (!ingredient_id || quantity_g === undefined || quantity_g < 0) {
        return res.status(400).json({
          message: 'Each item needs ingredient_id and quantity_g >= 0',
        });
      }

      const ingCheck = await pool.query(
        `SELECT id, display_name FROM ingredients WHERE id = $1`,
        [ingredient_id]
      );
      if (ingCheck.rows.length === 0) {
        return res.status(404).json({ message: `Ingredient ${ingredient_id} not found` });
      }

      const row = await pool.query(
        `INSERT INTO inventory (school_id, ingredient_id, quantity_g, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (school_id, ingredient_id)
         DO UPDATE SET quantity_g = EXCLUDED.quantity_g, updated_at = NOW()
         RETURNING *`,
        [school_id, ingredient_id, quantity_g]
      );

      upserted.push({
        ...row.rows[0],
        display_name: ingCheck.rows[0].display_name,
      });
    }

    // CHANGE 1: Inventory changed → cached suggestions are stale → delete them
    await invalidateSuggestionsCache(school_id);

    return res.status(200).json({
      message: `${upserted.length} inventory item(s) updated. Suggestion cache cleared.`,
      inventory: upserted,
    });

  } catch (err) {
    console.error('Upsert Inventory Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET INVENTORY   GET /api/inventory
// =============================================================
export const getInventory = async (req, res) => {
  try {
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT
         inv.id,
         inv.ingredient_id,
         inv.quantity_g,
         inv.updated_at,
         i.display_name,
         i.category,
         n.calories_per_100g,
         n.protein_per_100g,
         n.carbs_per_100g,
         n.fat_per_100g,
         n.fiber_per_100g,
         n.iron_mg_per_100g,
         n.calcium_mg_per_100g
       FROM inventory inv
       JOIN ingredients i ON inv.ingredient_id = i.id
       JOIN ingredient_nutrition n ON i.id = n.ingredient_id
       WHERE inv.school_id = $1
       ORDER BY i.category, i.display_name`,
      [school_id]
    );

    return res.status(200).json({
      total_items: result.rows.length,
      inventory: result.rows,
    });

  } catch (err) {
    console.error('Get Inventory Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// DELETE INVENTORY ITEM   DELETE /api/inventory/:ingredient_id
// =============================================================
export const deleteInventoryItem = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { ingredient_id } = req.params;

    const result = await pool.query(
      `DELETE FROM inventory
       WHERE school_id = $1 AND ingredient_id = $2
       RETURNING id`,
      [school_id, ingredient_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found in inventory' });
    }

    // CHANGE 1: Inventory changed → invalidate cache
    await invalidateSuggestionsCache(school_id);

    return res.status(200).json({
      message: 'Inventory item removed. Suggestion cache cleared.',
    });

  } catch (err) {
    console.error('Delete Inventory Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};  