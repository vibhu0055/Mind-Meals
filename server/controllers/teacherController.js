import pool from "../database/database.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.js";


// =========================
// CREATE TEACHER 
// =========================
export const createTeacher = async (req, res) => {
  try {
    const school_id = req.user.school_id; // from JWT middleware

    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, password required" });
    }

    // check duplicate in same school
    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND school_id = $2",
      [email, school_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Teacher already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert teacher
    const result = await pool.query(
      `INSERT INTO users (school_id, name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, 'teacher', $5)
       RETURNING id, name, email, role, school_id`,
      [school_id, name, email, hashedPassword, phone]
    );

    return res.status(201).json({
      message: "Teacher created successfully",
      teacher: result.rows[0]
    });

  } catch (err) {
    console.error("Create Teacher Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// DELETE TEACHER (SCHOOL ONLY)
// =========================
export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params; // teacher id
    const { school_id } = req.user;

    // 1. Check teacher exists in same school
    const teacherCheck = await pool.query(
      `SELECT * FROM users 
       WHERE id = $1 AND school_id = $2 AND role = 'teacher'`,
      [id, school_id]
    );

    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    // 2. Delete teacher
    await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );

    return res.status(200).json({
      message: "Teacher deleted successfully"
    });

  } catch (err) {
    console.error("Delete Teacher Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// =========================
// TEACHER LOGIN
// =========================
export const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // find teacher
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE email = $1 AND role = 'teacher'`,
      [email]
    );

    const teacher = result.rows[0];

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // check password
    const isMatch = await bcrypt.compare(password, teacher.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // generate token
    const token = generateToken({
      user_id: teacher.id,
      school_id: teacher.school_id,
      role: "teacher"
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        school_id: teacher.school_id
      }
    });

  } catch (err) {
    console.error("Teacher Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// UPDATE MEAL PERMISSION
// ========================= 
export const updateMealPermission = async (req, res) => {
  try {
    const { id } = req.params; // teacher id
    const { can_manage_meals } = req.body;
    const { school_id } = req.user;

    if (typeof can_manage_meals !== "boolean") {
      return res.status(400).json({
        message: "can_manage_meals must be true or false"
      });
    }

    // 1. Check teacher exists in same school
    const teacherCheck = await pool.query(
      `SELECT * FROM users 
       WHERE id = $1 AND school_id = $2 AND role = 'teacher'`,
      [id, school_id]
    );

    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    // 2. Update permission
    const result = await pool.query(
      `UPDATE users
       SET can_manage_meals = $1
       WHERE id = $2
       RETURNING id, name, can_manage_meals`,
      [can_manage_meals, id]
    );

    return res.status(200).json({
      message: "Permission updated successfully",
      teacher: result.rows[0]
    });

  } catch (err) {
    console.error("Update Permission Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// GET ALL TEACHERS (SCHOOL ONLY)
// =========================
export const getTeachers = async (req, res) => {
  try {
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.can_manage_meals,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id', c.id,
               'name', c.name,
               'section', c.section
             )
             ORDER BY c.id DESC
           ) FILTER (WHERE c.id IS NOT NULL),
           '[]'
         ) AS assigned_classes
       FROM users u
       LEFT JOIN teacher_classes tc ON tc.teacher_id = u.id
       LEFT JOIN classes c ON c.id = tc.class_id AND c.school_id = u.school_id
       WHERE u.school_id = $1 AND u.role = 'teacher'
       GROUP BY u.id, u.name, u.email, u.phone, u.can_manage_meals
       ORDER BY u.id DESC`,
      [school_id]
    );

    return res.status(200).json({
      teachers: result.rows
    });

  } catch (err) {
    console.error("Get Teachers Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// =========================
// GET TEACHER PROFILE (SELF)
// =========================
export const getTeacherProfile = async (req, res) => {
  try {
    const { user_id } = req.user;

    const result = await pool.query(
      `SELECT id, name, email, phone, school_id, can_manage_meals
       FROM users
       WHERE id = $1 AND role = 'teacher'`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    return res.status(200).json({
      teacher: result.rows[0]
    });

  } catch (err) {
    console.error("Get Profile Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
