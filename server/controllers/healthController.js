import pool from '../database/database.js';

// Helper: calculate BMI category
const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25.0) return 'Normal';
  if (bmi < 30.0) return 'Overweight';
  return 'Obese';
};

// POST /api/health
// Teacher submits height, weight, MUAC for a student
export const addHealthRecord = async (req, res) => {
  const { student_id, height_cm, weight_kg, muac_cm } = req.body;
  const teacher_id = req.user.id; // from JWT via authMiddleware

  if (!student_id || !height_cm || !weight_kg) {
    return res.status(400).json({ message: 'student_id, height_cm and weight_kg are required.' });
  }

  try {
    // Check student exists
    const studentCheck = await pool.query(
      `SELECT id FROM student WHERE id = $1`,
      [student_id]
    );
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Calculate BMI
    const heightM = height_cm / 100;
    const bmi = parseFloat((weight_kg / (heightM * heightM)).toFixed(2));
    const bmi_category = getBMICategory(bmi);

    const result = await pool.query(
      `INSERT INTO health_record
        (student_id, teacher_id, height_cm, weight_kg, muac_cm, bmi, bmi_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [student_id, teacher_id, height_cm, weight_kg, muac_cm || null, bmi, bmi_category]
    );

    return res.status(201).json({
      message: 'Health record added successfully.',
      record: result.rows[0],
    });

  } catch (err) {
    console.error('Add health record error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/health/student/:student_id
// Get all health records for a student (teacher, admin, parent can access)
export const getHealthRecordsByStudent = async (req, res) => {
  const { student_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT hr.*, s.name AS student_name, t.name AS teacher_name
       FROM health_record hr
       JOIN student s ON hr.student_id = s.id
       JOIN teacher t ON hr.teacher_id = t.id
       WHERE hr.student_id = $1
       ORDER BY hr.recorded_at DESC`,
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No health records found for this student.' });
    }

    return res.status(200).json({ records: result.rows });

  } catch (err) {
    console.error('Get health records error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/health/:id
// Get a single health record by its ID
export const getHealthRecordById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT hr.*, s.name AS student_name, t.name AS teacher_name
       FROM health_record hr
       JOIN student s ON hr.student_id = s.id
       JOIN teacher t ON hr.teacher_id = t.id
       WHERE hr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Health record not found.' });
    }

    return res.status(200).json({ record: result.rows[0] });

  } catch (err) {
    console.error('Get health record error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/health/latest/:student_id
// Get only the most recent health record for a student
export const getLatestHealthRecord = async (req, res) => {
  const { student_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT hr.*, s.name AS student_name
       FROM health_record hr
       JOIN student s ON hr.student_id = s.id
       WHERE hr.student_id = $1
       ORDER BY hr.recorded_at DESC
       LIMIT 1`,
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No health record found.' });
    }

    return res.status(200).json({ record: result.rows[0] });

  } catch (err) {
    console.error('Get latest health record error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};