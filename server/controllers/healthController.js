import pool from '../database/database.js';

// =========================
// BMI CATEGORY HELPER
// =========================
const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25.0) return 'Normal';
  if (bmi < 30.0) return 'Overweight';
  return 'Obese';
};

// =========================
// ADD HEALTH RECORD
// =========================
export const addHealthRecord = async (req, res) => {
  const { student_id, height_cm, weight_kg, muac_cm } = req.body;

  const { user_id: teacher_id, school_id } = req.user;

  if (!student_id || !height_cm || !weight_kg) {
    return res.status(400).json({
      message: 'student_id, height_cm and weight_kg are required'
    });
  }

  try {
    // 1. Check student
    const studentCheck = await pool.query(
      `SELECT id, class_id, school_id FROM students WHERE id = $1`,
      [student_id]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = studentCheck.rows[0];

    // 2. School safety
    if (student.school_id !== school_id) {
      return res.status(403).json({
        message: 'You cannot access this student'
      });
    }

    // 3. Teacher-class validation (🔥 IMPORTANT)
    const assignmentCheck = await pool.query(
      `SELECT * FROM teacher_classes 
       WHERE teacher_id = $1 AND class_id = $2`,
      [teacher_id, student.class_id]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({
        message: 'You are not assigned to this class'
      });
    }

    // 4. Calculate BMI
    const heightM = height_cm / 100;
    const bmi = parseFloat((weight_kg / (heightM * heightM)).toFixed(2));
    const bmi_category = getBMICategory(bmi);

    // 5. Insert
    const result = await pool.query(
      `INSERT INTO health_records
       (student_id, teacher_id, height_cm, weight_kg, muac_cm, bmi, bmi_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [student_id, teacher_id, height_cm, weight_kg, muac_cm || null, bmi, bmi_category]
    );

    return res.status(201).json({
      message: 'Health record added successfully',
      record: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =========================
// GET ALL RECORDS OF STUDENT
// =========================

export const getHealthRecordsByStudent = async (req, res) => {
  const { student_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT hr.*, s.name AS student_name, u.name AS teacher_name
       FROM health_records hr
       JOIN students s ON hr.student_id = s.id
       JOIN users u ON hr.teacher_id = u.id
       WHERE hr.student_id = $1
       ORDER BY hr.recorded_at DESC`,
      [student_id]
    );

    return res.status(200).json({ records: result.rows });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =========================
// GET SINGLE RECORD
// =========================

export const getHealthRecordById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT hr.*, s.name AS student_name, u.name AS teacher_name
       FROM health_records hr
       JOIN students s ON hr.student_id = s.id
       JOIN users u ON hr.teacher_id = u.id
       WHERE hr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    return res.status(200).json({ record: result.rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =========================
// GET LATEST RECORD
// =========================

export const getLatestHealthRecord = async (req, res) => {
  const { student_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT hr.*, s.name AS student_name
       FROM health_records hr
       JOIN students s ON hr.student_id = s.id
       WHERE hr.student_id = $1
       ORDER BY hr.recorded_at DESC
       LIMIT 1`,
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No record found' });
    }

    return res.status(200).json({ record: result.rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};