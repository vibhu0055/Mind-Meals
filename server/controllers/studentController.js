import pool from "../database/database.js";

// =========================
// ADD STUDENT (TEACHER ONLY)
// =========================
export const addStudent = async (req, res) => {
  try {
    const { user_id: teacher_id, school_id } = req.user;

    const { name, age, gender, class_id } = req.body;

    // 1. Basic validation
    if (!name || !age || !class_id) {
      return res.status(400).json({
        message: "Name, age and class_id are required"
      });
    }

    // 2. Check class exists AND belongs to same school
    const classCheck = await pool.query(
      `SELECT * FROM classes 
       WHERE id = $1 AND school_id = $2`,
      [class_id, school_id]
    );

    if (classCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Class not found in your school"
      });
    }

    // 3. Check teacher is assigned to this class (🔥 CRITICAL)
    const assignmentCheck = await pool.query(
      `SELECT * FROM teacher_classes
       WHERE teacher_id = $1 AND class_id = $2`,
      [teacher_id, class_id]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({
        message: "You are not assigned to this class"
      });
    }

    // 4. Insert student
    const result = await pool.query(
      `INSERT INTO students (school_id, class_id, name, age, gender)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [school_id, class_id, name, age, gender]
    );

    return res.status(201).json({
      message: "Student added successfully",
      student: result.rows[0]
    });

  } catch (err) {
    console.error("Add Student Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
  // ----------------------------------------
  //  GET ALL STUDENTS (for teacher dashboard)
  // -----------------------------------------

export const getStudents = async (req, res) => {
  try {
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT s.*, c.name AS class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.school_id = $1
       ORDER BY s.id DESC`,
      [school_id]
    );

    return res.status(200).json({
      students: result.rows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

  // ----------------------------------------
  //  GET Students by CLass
  // -----------------------------------------

  export const getStudentsByClass = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { class_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM students
       WHERE school_id = $1 AND class_id = $2
       ORDER BY id DESC`,
      [school_id, class_id]
    );

    return res.status(200).json({
      students: result.rows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

  // ----------------------------------------
  //  GET Single Student
  // -----------------------------------------

export const getStudentById = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM students
       WHERE id = $1 AND school_id = $2`,
      [id, school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({
      student: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};