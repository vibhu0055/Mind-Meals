// =========================
// INGREDIENT CONTROLLER
// =========================

import pool from '../database/database.js';

// ── ADD INGREDIENT ────────────────────────────────────────────────────────────
// POST /api/ingredient/add   (school or meal-manager teacher)
export const addIngredient = async (req, res) => {
  try {
    const {
      name,
      calories_kcal,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      iron_mg,
      calcium_mg,
      vitamin_a_mcg,
      vitamin_c_mg,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Ingredient name is required' });
    }

    const result = await pool.query(
      `INSERT INTO ingredients
         (name, calories_kcal, protein_g, carbs_g, fat_g, fiber_g,
          iron_mg, calcium_mg, vitamin_a_mcg, vitamin_c_mg)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name,
        calories_kcal ?? null,
        protein_g     ?? null,
        carbs_g       ?? null,
        fat_g         ?? null,
        fiber_g       ?? null,
        iron_mg       ?? null,
        calcium_mg    ?? null,
        vitamin_a_mcg ?? null,
        vitamin_c_mg  ?? null,
      ]
    );

    return res.status(201).json({
      message: 'Ingredient added successfully',
      ingredient: result.rows[0],
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Ingredient already exists' });
    }
    console.error('Add Ingredient Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET ALL INGREDIENTS ───────────────────────────────────────────────────────
// GET /api/ingredient/
export const getAllIngredients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ingredients ORDER BY name ASC`
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

// ── UPDATE INGREDIENT ─────────────────────────────────────────────────────────
// PATCH /api/ingredient/:id   (school only)
export const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      calories_kcal,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      iron_mg,
      calcium_mg,
      vitamin_a_mcg,
      vitamin_c_mg,
    } = req.body;

    const existing = await pool.query(
      `SELECT * FROM ingredients WHERE id = $1`, [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }

    const result = await pool.query(
      `UPDATE ingredients SET
         name           = COALESCE($1, name),
         calories_kcal  = COALESCE($2, calories_kcal),
         protein_g      = COALESCE($3, protein_g),
         carbs_g        = COALESCE($4, carbs_g),
         fat_g          = COALESCE($5, fat_g),
         fiber_g        = COALESCE($6, fiber_g),
         iron_mg        = COALESCE($7, iron_mg),
         calcium_mg     = COALESCE($8, calcium_mg),
         vitamin_a_mcg  = COALESCE($9, vitamin_a_mcg),
         vitamin_c_mg   = COALESCE($10, vitamin_c_mg)
       WHERE id = $11
       RETURNING *`,
      [
        name          ?? null,
        calories_kcal ?? null,
        protein_g     ?? null,
        carbs_g       ?? null,
        fat_g         ?? null,
        fiber_g       ?? null,
        iron_mg       ?? null,
        calcium_mg    ?? null,
        vitamin_a_mcg ?? null,
        vitamin_c_mg  ?? null,
        id,
      ]
    );

    return res.status(200).json({
      message: 'Ingredient updated',
      ingredient: result.rows[0],
    });

  } catch (err) {
    console.error('Update Ingredient Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── DELETE INGREDIENT ─────────────────────────────────────────────────────────
// DELETE /api/ingredient/:id   (school only)
export const deleteIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(
      `SELECT * FROM ingredients WHERE id = $1`, [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }

    await pool.query(`DELETE FROM ingredients WHERE id = $1`, [id]);
    return res.status(200).json({ message: 'Ingredient deleted successfully' });

  } catch (err) {
    console.error('Delete Ingredient Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};