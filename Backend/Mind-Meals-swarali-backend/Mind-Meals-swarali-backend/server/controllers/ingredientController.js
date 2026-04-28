// =========================
// INGREDIENT CONTROLLER
// =========================

import pool from '../database/database.js';


// ── GET ALL INGREDIENTS ───────────────────────────────────────────────────────
// GET /api/ingredient/
export const getAllIngredients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, display_name, category FROM ingredients ORDER BY display_name`
    );
    return res.status(200).json({ ingredients: result.rows });
  } catch (err) {
    console.error('Get Ingredients Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET SINGLE INGREDIENT ─────────────────────────────────────────────────────
// GET /api/ingredient/:id
export const getIngredientById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM ingredients WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }
    return res.status(200).json({ ingredient: result.rows[0] });
  } catch (err) {
    console.error('Get Ingredient Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};




