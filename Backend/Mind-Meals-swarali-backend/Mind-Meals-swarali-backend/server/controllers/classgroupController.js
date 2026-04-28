// =========================
// CLASS GROUP CONTROLLER
// =========================
// Manages the mapping of classes → nutrition groups (G1–G4)
// School assigns each class to a group; this is used for meal distribution.

import pool from '../database/database.js';
import { GROUP_CONFIG } from '../services/mealService.js';

// ── ASSIGN CLASS TO GROUP ─────────────────────────────────────────────────────
// POST /api/class-group/assign   (school only)
// Body: { class_id, group_label }   e.g. { class_id: 3, group_label: "G2" }
export const assignClassToGroup = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { class_id, group_label } = req.body;

    if (!class_id || !group_label) {
      return res.status(400).json({ message: 'class_id and group_label are required' });
    }

    if (!GROUP_CONFIG[group_label]) {
      return res.status(400).json({
        message: `Invalid group_label. Must be one of: ${Object.keys(GROUP_CONFIG).join(', ')}`,
      });
    }

    // Verify class belongs to this school
    const classCheck = await pool.query(
      `SELECT * FROM classes WHERE id = $1 AND school_id = $2`,
      [class_id, school_id]
    );
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Class not found in your school' });
    }

    const { weight, rda_calories } = GROUP_CONFIG[group_label];

    const result = await pool.query(
      `INSERT INTO class_groups (school_id, class_id, group_label, weight, rda_calories)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (school_id, class_id) DO UPDATE SET
         group_label  = EXCLUDED.group_label,
         weight       = EXCLUDED.weight,
         rda_calories = EXCLUDED.rda_calories
       RETURNING *`,
      [school_id, class_id, group_label, weight, rda_calories]
    );

    return res.status(201).json({
      message: `Class assigned to ${group_label} successfully`,
      class_group: result.rows[0],
    });

  } catch (err) {
    console.error('Assign Class Group Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET ALL CLASS-GROUP MAPPINGS FOR SCHOOL ───────────────────────────────────
// GET /api/class-group/   (school or teacher)
export const getClassGroups = async (req, res) => {
  try {
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT cg.*, c.name AS class_name, c.section
       FROM class_groups cg
       JOIN classes c ON cg.class_id = c.id
       WHERE cg.school_id = $1
       ORDER BY cg.group_label, c.name`,
      [school_id]
    );

    return res.status(200).json({ class_groups: result.rows });

  } catch (err) {
    console.error('Get Class Groups Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET GROUP CONFIG REFERENCE ────────────────────────────────────────────────
// GET /api/class-group/config   (public reference, no auth needed)
export const getGroupConfig = async (req, res) => {
  return res.status(200).json({
    groups: Object.entries(GROUP_CONFIG).map(([label, config]) => ({
      group_label: label,
      ...config,
    })),
    description: {
      G1: 'Classes 1–2, Age 6–7 yrs',
      G2: 'Classes 3–4, Age 8–9 yrs',
      G3: 'Classes 5–6, Age 10–11 yrs (base group)',
      G4: 'Classes 7–8, Age 12–13 yrs',
    },
  });
};