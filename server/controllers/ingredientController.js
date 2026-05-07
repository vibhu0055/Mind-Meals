// =============================================================
// INGREDIENT CONTROLLER
// Search, category filters, pagination, nutrient preview
// =============================================================

import pool from '../database/database.js';

// =============================================================
// GET ALL INGREDIENTS (with search, category filter, pagination)
// GET /api/ingredient/?search=rice&category=Cereal&page=1&limit=20
// =============================================================
export const getAllIngredients = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;

    const offset  = (parseInt(page) - 1) * parseInt(limit);
    const params  = [];
    const where   = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(i.display_name ILIKE $${params.length} OR i.name ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      where.push(`i.category = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Total count for pagination
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM ingredients i ${whereClause}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    // Add pagination params
    params.push(parseInt(limit));
    params.push(offset);

    const result = await pool.query(
      `SELECT
         i.id,
         i.display_name,
         i.category,
         n.calories_per_100g,
         n.protein_per_100g,
         n.carbs_per_100g,
         n.fat_per_100g,
         n.iron_mg_per_100g,
         n.calcium_mg_per_100g
       FROM ingredients i
       LEFT JOIN ingredient_nutrition n ON i.id = n.ingredient_id
       ${whereClause}
       ORDER BY i.display_name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.status(200).json({
      ingredients: result.rows,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (err) {
    console.error('Get Ingredients Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET INGREDIENT CATEGORIES
// GET /api/ingredient/categories
// =============================================================
export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category FROM ingredients ORDER BY category ASC`
    );
    return res.status(200).json({ categories: result.rows.map(r => r.category) });
  } catch (err) {
    console.error('Get Categories Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================
// GET SINGLE INGREDIENT WITH FULL NUTRIENT PREVIEW
// GET /api/ingredient/:id
// =============================================================
export const getIngredientById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         i.id, i.name, i.display_name, i.category,
         n.calories_per_100g,
         n.protein_per_100g,
         n.carbs_per_100g,
         n.fat_per_100g,
         n.fiber_per_100g,
         n.iron_mg_per_100g,
         n.calcium_mg_per_100g
       FROM ingredients i
       LEFT JOIN ingredient_nutrition n ON i.id = n.ingredient_id
       WHERE i.id = $1`,
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

// =============================================================
// GET INGREDIENT NUTRIENT PREVIEW (nutrient values per 100g)
// GET /api/ingredient/:id/nutrition
// =============================================================
export const getIngredientNutrition = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         i.display_name,
         i.category,
         n.calories_per_100g   AS calories,
         n.protein_per_100g    AS protein,
         n.carbs_per_100g      AS carbs,
         n.fat_per_100g        AS fat,
         n.fiber_per_100g      AS fiber,
         n.iron_mg_per_100g    AS iron_mg,
         n.calcium_mg_per_100g AS calcium_mg
       FROM ingredients i
       JOIN ingredient_nutrition n ON i.id = n.ingredient_id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ingredient or its nutrition data not found' });
    }

    const r = result.rows[0];
    return res.status(200).json({
      ingredient_id: parseInt(id),
      display_name:  r.display_name,
      category:      r.category,
      per_100g: {
        calories_kcal: parseFloat(r.calories  || 0),
        protein_g:     parseFloat(r.protein   || 0),
        carbs_g:       parseFloat(r.carbs     || 0),
        fat_g:         parseFloat(r.fat       || 0),
        fiber_g:       parseFloat(r.fiber     || 0),
        iron_mg:       parseFloat(r.iron_mg   || 0),
        calcium_mg:    parseFloat(r.calcium_mg|| 0),
      },
    });

  } catch (err) {
    console.error('Get Ingredient Nutrition Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
