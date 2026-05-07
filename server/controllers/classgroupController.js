// =========================
// CLASS GROUP CONTROLLER
// =========================
// Manages organizational mapping of classes → groups (G1–G4)
//
// IMPORTANT:
// Groups are now ONLY used for:
// - reporting organization
// - meal distribution aggregation
// - analytics grouping
//
// Nutrition calculation is NO LONGER based on static group configs.
// Real nutrition distribution now uses:
// - student age
// - student gender
// - dynamic RDA lookup
// =========================

import pool from '../database/database.js';

// ── Allowed organizational groups ─────────────────────────────
const ALLOWED_GROUPS = ['G1', 'G2', 'G3', 'G4'];

// =============================================================
// ASSIGN CLASS TO GROUP
// POST /api/class-group/assign   (school only)
//
// Body:
// {
//   class_id: 3,
//   group_label: "G2"
// }
// =============================================================
export const assignClassToGroup = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { class_id, group_label } = req.body;

    if (!class_id || !group_label) {
      return res.status(400).json({
        message: 'class_id and group_label are required',
      });
    }

    // Validate allowed group labels
    if (!ALLOWED_GROUPS.includes(group_label)) {
      return res.status(400).json({
        message: `Invalid group_label. Must be one of: ${ALLOWED_GROUPS.join(', ')}`,
      });
    }

    // Verify class belongs to this school
    const classCheck = await pool.query(
      `SELECT id, name
       FROM classes
       WHERE id = $1 AND school_id = $2`,
      [class_id, school_id]
    );

    if (classCheck.rows.length === 0) {
      return res.status(404).json({
        message: 'Class not found in your school',
      });
    }

    // Save/update organizational group mapping
    const result = await pool.query(
      `INSERT INTO class_groups (
         school_id,
         class_id,
         group_label
       )
       VALUES ($1, $2, $3)
       ON CONFLICT (school_id, class_id)
       DO UPDATE SET
         group_label = EXCLUDED.group_label,
         updated_at = NOW()
       RETURNING *`,
      [school_id, class_id, group_label]
    );

    return res.status(201).json({
      message: `Class assigned to ${group_label} successfully`,
      class_group: result.rows[0],
    });

  } catch (err) {
    console.error('Assign Class Group Error:', err);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};

// =============================================================
// GET ALL CLASS-GROUP MAPPINGS FOR SCHOOL
// GET /api/class-group/
// (school or teacher)
// =============================================================
export const getClassGroups = async (req, res) => {
  try {
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT
         cg.id,
         cg.school_id,
         cg.class_id,
         cg.group_label,
         cg.created_at,
         cg.updated_at,
         c.name AS class_name,
         c.section
       FROM class_groups cg
       JOIN classes c
         ON cg.class_id = c.id
       WHERE cg.school_id = $1
       ORDER BY cg.group_label ASC, c.name ASC`,
      [school_id]
    );

    return res.status(200).json({
      class_groups: result.rows,
    });

  } catch (err) {
    console.error('Get Class Groups Error:', err);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};

// =============================================================
// GET AVAILABLE GROUP LABELS
// GET /api/class-group/config
//
// NOTE:
// Groups are now organizational labels only.
// Nutrition distribution is dynamically computed using:
// - student age
// - student gender
// - ICMR-NIN RDA references
// =============================================================
export const getGroupConfig = async (req, res) => {
  return res.status(200).json({
    groups: ALLOWED_GROUPS,
    description:
      'Groups are organizational labels used for reporting and aggregation only. Nutrition distribution is dynamically computed from real student age, gender, and RDA data.',
  });
};