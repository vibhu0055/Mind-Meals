import pool from "../database/database.js";

// =========================
// CREATE CLASS (SCHOOL ONLY)
// =========================
export const createClass = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { name, section } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Class name is required"
      });
    }

    const result = await pool.query(
      `INSERT INTO classes (school_id, name, section)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [school_id, name, section || null]
    );

    return res.status(201).json({
      message: "Class created successfully",
      class: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// GET ALL CLASSES
// =========================
export const getClasses = async (req, res) => {
  try {
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT * FROM classes
       WHERE school_id = $1
       ORDER BY id DESC`,
      [school_id]
    );

    return res.status(200).json({
      classes: result.rows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// ASSIGN TEACHER TO CLASS
// =========================
export const assignTeacherToClass = async (req, res) => {
  try {
    const { teacher_id, class_id } = req.body;
    const { school_id } = req.user;

    if (!teacher_id || !class_id) {
      return res.status(400).json({
        message: "teacher_id and class_id required"
      });
    }

    // 1. check class belongs to school
    const classCheck = await pool.query(
      `SELECT * FROM classes WHERE id = $1 AND school_id = $2`,
      [class_id, school_id]
    );

    if (classCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Class not found"
      });
    }

    // 2. check teacher belongs to school
    const teacherCheck = await pool.query(
      `SELECT * FROM users WHERE id = $1 AND school_id = $2 AND role = 'teacher'`,
      [teacher_id, school_id]
    );

    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    // 3. insert mapping
    const result = await pool.query(
      `INSERT INTO teacher_classes (teacher_id, class_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [teacher_id, class_id]
    );

    return res.status(201).json({
      message: "Teacher assigned to class successfully",
      mapping: result.rows[0] || "Already assigned"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};