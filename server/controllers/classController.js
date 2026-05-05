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
      `SELECT
         c.*,
         assigned_teacher.teacher_id AS assigned_teacher_id,
         assigned_teacher.teacher_name AS assigned_teacher_name
       FROM classes c
       LEFT JOIN LATERAL (
         SELECT tc.teacher_id, u.name AS teacher_name
         FROM teacher_classes tc
         JOIN users u ON u.id = tc.teacher_id AND u.role = 'teacher'
         WHERE tc.class_id = c.id
         ORDER BY tc.id DESC
         LIMIT 1
       ) assigned_teacher ON true
       WHERE c.school_id = $1
       ORDER BY c.id DESC`,
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
// UPDATE CLASS (SCHOOL ONLY)
// =========================
export const updateClass = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const { name, section } = req.body;

    // 1. Check class exists in school
    const classCheck = await pool.query(
      `SELECT * FROM classes WHERE id = $1 AND school_id = $2`,
      [id, school_id]
    );

    if (classCheck.rows.length === 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    // 2. Update (partial)
    const result = await pool.query(
      `UPDATE classes
       SET name = COALESCE($1, name),
           section = COALESCE($2, section)
       WHERE id = $3 AND school_id = $4
       RETURNING *`,
      [name, section, id, school_id]
    );

    return res.status(200).json({
      message: "Class updated successfully",
      class: result.rows[0]
    });

  } catch (err) {
    console.error("Update Class Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// =========================
// DELETE CLASS (SCHOOL ONLY)
// =========================
export const deleteClass = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM classes
       WHERE id = $1 AND school_id = $2
       RETURNING *`,
      [id, school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    return res.status(200).json({
      message: "Class deleted successfully"
    });

  } catch (err) {
    console.error("Delete Class Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// ASSIGN TEACHER TO CLASS
// =========================
export const assignTeacherToClass = async (req, res) => {
  const client = await pool.connect();

  try {
    const { teacher_id, class_id } = req.body;
    const { school_id } = req.user;

    if (!teacher_id || !class_id) {
      return res.status(400).json({
        message: "teacher_id and class_id required"
      });
    }

    await client.query("BEGIN");

    // 1. check class belongs to school and lock it while changing assignment
    const classCheck = await client.query(
      `SELECT * FROM classes WHERE id = $1 AND school_id = $2 FOR UPDATE`,
      [class_id, school_id]
    );

    if (classCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Class not found"
      });
    }

    // 2. check teacher belongs to school
    const teacherCheck = await client.query(
      `SELECT * FROM users WHERE id = $1 AND school_id = $2 AND role = 'teacher'`,
      [teacher_id, school_id]
    );

    if (teacherCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    // 3. one class can have only one assigned teacher
    await client.query(
      `DELETE FROM teacher_classes
       WHERE class_id = $1`,
      [class_id]
    );

    await client.query(
      `INSERT INTO teacher_classes (teacher_id, class_id)
       VALUES ($1, $2)`,
      [teacher_id, class_id]
    );

    const result = await client.query(
      `SELECT
         tc.teacher_id,
         u.name AS teacher_name,
         tc.class_id,
         c.name AS class_name,
         c.section
       FROM teacher_classes tc
       JOIN users u ON u.id = tc.teacher_id AND u.role = 'teacher'
       JOIN classes c ON c.id = tc.class_id
       WHERE tc.teacher_id = $1 AND tc.class_id = $2 AND c.school_id = $3`,
      [teacher_id, class_id, school_id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Teacher assigned to class successfully",
      mapping: result.rows[0]
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};
