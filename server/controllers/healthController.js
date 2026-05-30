import pool from '../database/database.js';
import { calculateBMI, getBMICategory } from "../services/healthService.js";
import {
  checkStudentBelongsToSchool,
  checkTeacherAssignment
} from "../services/authService.js";
import { computeWhoStatus, toLabel } from "../utils/Wholms.js";

// Strip internal WHO fields, expose only malnutrition_label to frontend
const sanitizeRecord = (record) => {
  if (!record) return record;
  const { zscore, who_category, ...rest } = record;
  return {
    ...rest,
    malnutrition_label: toLabel(who_category) || null,
  };
};

// Helper — fetch student with DOB and gender for WHO computation
const fetchStudentForWho = async (student_id) => {
  const res = await pool.query(
    `SELECT id, age, gender, date_of_birth FROM students WHERE id = $1`,
    [student_id]
  );
  return res.rows[0] || null;
};

// =========================
// ADD HEALTH RECORD
// =========================
export const addHealthRecord = async (req, res) => {
  const { student_id, height_cm, weight_kg, muac_cm, recorded_at } = req.body;
  const { user_id: teacher_id, school_id } = req.user;

  if (!student_id || !height_cm || !weight_kg) {
    return res.status(400).json({
      message: 'student_id, height_cm and weight_kg are required'
    });
  }

  try {
    // 1. Check student
    const student = await checkStudentBelongsToSchool(student_id, school_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found or not in your school" });
    }

    // 2. Teacher-class validation
    const assignmentCheck = await pool.query(
      `SELECT * FROM teacher_classes WHERE teacher_id = $1 AND class_id = $2`,
      [teacher_id, student.class_id]
    );
    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this class' });
    }

    // 3. Calculate BMI
    const bmi = calculateBMI(height_cm, weight_kg);
    const bmi_category = getBMICategory(bmi);

    // 4. WHO z-score and category
    const studentFull = await fetchStudentForWho(student_id);
    const measureDate = recorded_at || new Date().toISOString().split('T')[0];
    const whoStatus = computeWhoStatus(
      bmi,
      studentFull?.gender,
      studentFull?.date_of_birth,
      measureDate,
      studentFull?.age
    );

    // 5. Insert
    const result = await pool.query(
      `INSERT INTO health_records
       (student_id, teacher_id, height_cm, weight_kg, muac_cm, bmi, bmi_category,
        zscore, who_category, age_months_at_measurement, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, CURRENT_DATE))
       RETURNING *`,
      [
        student_id, teacher_id, height_cm, weight_kg, muac_cm || null,
        bmi, bmi_category,
        whoStatus?.zscore ?? null,
        whoStatus?.who_category ?? null,
        whoStatus?.age_months_at_measurement ?? null,
        recorded_at || null,
      ]
    );

    const record = result.rows[0];
    return res.status(201).json({
      message: 'Health record added successfully',
      record: sanitizeRecord(record),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};


// =========================
// UPDATE HEALTH RECORD (TEACHER ONLY)
// =========================
export const updateHealthRecord = async (req, res) => {
  try {
    const { user_id: teacher_id, school_id } = req.user;
    const { id } = req.params;
    const { height_cm, weight_kg, muac_cm } = req.body;

    // 1. Check record exists + belongs to school
    const recordCheck = await pool.query(
      `SELECT hr.*, s.class_id, s.gender, s.date_of_birth, s.age, s.id AS sid
       FROM health_records hr
       JOIN students s ON hr.student_id = s.id
       WHERE hr.id = $1 AND s.school_id = $2`,
      [id, school_id]
    );
    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const record = recordCheck.rows[0];

    // 2. Teacher assignment check
    const assignmentCheck = await pool.query(
      `SELECT * FROM teacher_classes WHERE teacher_id = $1 AND class_id = $2`,
      [teacher_id, record.class_id]
    );
    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this class' });
    }

    // 3. Recalculate BMI and WHO status if height/weight updated
    let bmi          = record.bmi;
    let bmi_category = record.bmi_category;
    let zscore       = record.zscore;
    let who_category = record.who_category;
    let age_months   = record.age_months_at_measurement;

    if (height_cm || weight_kg) {
      const newHeight = height_cm || record.height_cm;
      const newWeight = weight_kg || record.weight_kg;
      bmi = calculateBMI(newHeight, newWeight);
      bmi_category = getBMICategory(bmi);

      const whoStatus = computeWhoStatus(
        bmi,
        record.gender,
        record.date_of_birth,
        record.recorded_at,
        record.age
      );
      zscore       = whoStatus?.zscore ?? null;
      who_category = whoStatus?.who_category ?? null;
      age_months   = whoStatus?.age_months_at_measurement ?? null;
    }

    // 4. Update
    const result = await pool.query(
      `UPDATE health_records
       SET height_cm                = COALESCE($1, height_cm),
           weight_kg                = COALESCE($2, weight_kg),
           muac_cm                  = COALESCE($3, muac_cm),
           bmi                      = $4,
           bmi_category             = $5,
           zscore                   = $6,
           who_category             = $7,
           age_months_at_measurement = $8
       WHERE id = $9
       RETURNING *`,
      [height_cm, weight_kg, muac_cm, bmi, bmi_category, zscore, who_category, age_months, id]
    );

    return res.status(200).json({
      message: 'Health record updated successfully',
      record: sanitizeRecord(result.rows[0]),
    });

  } catch (err) {
    console.error('Update Health Record Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


// =========================
// DELETE HEALTH RECORD (TEACHER ONLY)
// =========================
export const deleteHealthRecord = async (req, res) => {
  try {
    const { user_id: teacher_id, school_id } = req.user;
    const { id } = req.params;

    const recordCheck = await pool.query(
      `SELECT hr.*, s.class_id FROM health_records hr
       JOIN students s ON hr.student_id = s.id
       WHERE hr.id = $1 AND s.school_id = $2`,
      [id, school_id]
    );
    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const record = recordCheck.rows[0];
    const assignmentCheck = await pool.query(
      `SELECT * FROM teacher_classes WHERE teacher_id = $1 AND class_id = $2`,
      [teacher_id, record.class_id]
    );
    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this class' });
    }

    await pool.query(`DELETE FROM health_records WHERE id = $1`, [id]);

    return res.status(200).json({ message: 'Health record deleted successfully' });

  } catch (err) {
    console.error('Delete Health Record Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


// =========================
// GET ALL RECORDS OF STUDENT
// =========================
export const getHealthRecordsByStudent = async (req, res) => {
  const { student_id } = req.params;
  try {
    const studentCheck = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND school_id = $2',
      [student_id, req.user.school_id]
    );
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found in your school' });
    }

    const result = await pool.query(
      `SELECT hr.*, s.name AS student_name, u.name AS teacher_name
       FROM health_records hr
       JOIN students s ON hr.student_id = s.id
       JOIN users u ON hr.teacher_id = u.id
       WHERE hr.student_id = $1
       ORDER BY hr.recorded_at DESC`,
      [student_id]
    );

    return res.status(200).json({ records: result.rows.map(sanitizeRecord) });
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
       WHERE hr.id = $1 AND s.school_id = $2`,
      [id, req.user.school_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    return res.status(200).json({ record: sanitizeRecord(result.rows[0]) });
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
    const studentCheck = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND school_id = $2',
      [student_id, req.user.school_id]
    );
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found in your school' });
    }

    const result = await pool.query(
      `SELECT hr.*, s.name AS student_name
       FROM health_records hr
       JOIN students s ON hr.student_id = s.id
       WHERE hr.student_id = $1
       ORDER BY hr.recorded_at DESC, hr.id DESC
       LIMIT 1`,
      [student_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No record found' });
    }
    return res.status(200).json({ record: sanitizeRecord(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};