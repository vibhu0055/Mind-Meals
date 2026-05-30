import pool from "../database/database.js";
import { toLabel, LABEL_TO_WHO, VALID_LABELS } from "../utils/whoLMS.js";
import {
  checkClassBelongsToSchool,
  checkTeacherAssignment
} from "../services/authService.js";
import { sendMalnutritionAlert, ALERT_CATEGORIES } from '../services/notificationService.js';

// =========================
// ADD STUDENT (TEACHER ONLY)
// =========================
export const addStudent = async (req, res) => {
  try {
    const { user_id: teacher_id, school_id } = req.user;

    const { name, age, gender, class_id, date_of_birth, parent_email, parent_phone } = req.body;

    // 1. Basic validation
    if (!name || !age || !class_id) {
      return res.status(400).json({
        message: "Name, age and class_id are required"
      });
    }

    // 2. Check class belongs to school
    const classExists = await checkClassBelongsToSchool(class_id, school_id);

    if (!classExists) {
      return res.status(404).json({
        message: "Class not found in your school"
      });
    }

    // 3. Check teacher assignment
    const isAssigned = await checkTeacherAssignment(teacher_id, class_id);

    if (!isAssigned) {
      return res.status(403).json({
        message: "You are not assigned to this class"
      });
    }

    // 4. Insert student
    const result = await pool.query(
      `INSERT INTO students (school_id, class_id, name, age, gender, date_of_birth, parent_email, parent_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [school_id, class_id, name, age, gender, date_of_birth || null,
       parent_email || null, parent_phone || null]
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
    const { bmi_category, malnutrition_label } = req.query;

    const VALID_BMI = ['Underweight', 'Normal', 'Overweight', 'Obese'];

    if (bmi_category && !VALID_BMI.includes(bmi_category)) {
      return res.status(400).json({
        message: `Invalid bmi_category. Must be one of: ${VALID_BMI.join(', ')}`
      });
    }
    if (malnutrition_label && !VALID_LABELS.includes(malnutrition_label)) {
      return res.status(400).json({
        message: `Invalid malnutrition_label. Must be one of: ${VALID_LABELS.join(', ')}`
      });
    }

    const who_category = malnutrition_label ? LABEL_TO_WHO[malnutrition_label] : null;

    const params = [school_id];
    const hasFilter = bmi_category || who_category;
    const lateralJoin = hasFilter ? 'JOIN' : 'LEFT JOIN';

    let filterClause = '';
    if (bmi_category) {
      params.push(bmi_category);
      filterClause += ` AND hr.bmi_category = $${params.length}`;
    }
    if (who_category) {
      params.push(who_category);
      filterClause += ` AND hr.who_category = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         s.*,
         c.name         AS class_name,
         c.level        AS class_level,
         hr.bmi,
         hr.bmi_category,
         hr.malnutrition_label,
         hr.height_cm,
         hr.weight_kg,
         hr.recorded_at AS health_recorded_at
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       ${lateralJoin} LATERAL (
         SELECT bmi, bmi_category, who_category, height_cm, weight_kg, recorded_at,
                CASE health_records.who_category
                  WHEN 'severe_thinness' THEN 'Critical'
                  WHEN 'thinness'        THEN 'High Risk'
                  WHEN 'moderate_risk'   THEN 'Moderate Risk'
                  WHEN 'normal'          THEN 'Safe'
                  WHEN 'obese'           THEN 'Obese'
                  ELSE NULL
                END AS malnutrition_label
         FROM health_records
         WHERE student_id = s.id
         ORDER BY recorded_at DESC, id DESC
         LIMIT 1
       ) hr ON true
       WHERE s.school_id = $1 ${filterClause}
       ORDER BY s.id DESC`,
      params
    );

    return res.status(200).json({
      students:     result.rows,
      total:        result.rows.length,
      bmi_filter:           bmi_category      || null,
      malnutrition_filter:  malnutrition_label || null,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ----------------------------------------
//  GET Students by CLass
// -----------------------------------------

export const getStudentsByClass = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { class_id }  = req.params;
    const { bmi_category, malnutrition_label } = req.query;

    const VALID_BMI = ['Underweight', 'Normal', 'Overweight', 'Obese'];

    if (bmi_category && !VALID_BMI.includes(bmi_category)) {
      return res.status(400).json({
        message: `Invalid bmi_category. Must be one of: ${VALID_BMI.join(', ')}`
      });
    }
    if (malnutrition_label && !VALID_LABELS.includes(malnutrition_label)) {
      return res.status(400).json({
        message: `Invalid malnutrition_label. Must be one of: ${VALID_LABELS.join(', ')}`
      });
    }

    const who_category = malnutrition_label ? LABEL_TO_WHO[malnutrition_label] : null;

    const params = [school_id, class_id];
    const hasFilter = bmi_category || who_category;
    const lateralJoin = hasFilter ? 'JOIN' : 'LEFT JOIN';

    let filterClause = '';
    if (bmi_category) {
      params.push(bmi_category);
      filterClause += ` AND hr.bmi_category = $${params.length}`;
    }
    if (who_category) {
      params.push(who_category);
      filterClause += ` AND hr.who_category = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         s.*,
         hr.bmi,
         hr.bmi_category,
         hr.malnutrition_label,
         hr.height_cm,
         hr.weight_kg,
         hr.recorded_at AS health_recorded_at
       FROM students s
       ${lateralJoin} LATERAL (
         SELECT bmi, bmi_category, who_category, height_cm, weight_kg, recorded_at,
                CASE health_records.who_category
                  WHEN 'severe_thinness' THEN 'Critical'
                  WHEN 'thinness'        THEN 'High Risk'
                  WHEN 'moderate_risk'   THEN 'Moderate Risk'
                  WHEN 'normal'          THEN 'Safe'
                  WHEN 'obese'           THEN 'Obese'
                  ELSE NULL
                END AS malnutrition_label
         FROM health_records
         WHERE student_id = s.id
         ORDER BY recorded_at DESC, id DESC
         LIMIT 1
       ) hr ON true
       WHERE s.school_id = $1 AND s.class_id = $2 ${filterClause}
       ORDER BY s.id DESC`,
      params
    );

    return res.status(200).json({
      students:   result.rows,
      total:      result.rows.length,
      bmi_filter:           bmi_category      || null,
      malnutrition_filter:  malnutrition_label || null,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
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

// =========================
// UPDATE STUDENT (TEACHER ONLY)
// =========================
export const updateStudent = async (req, res) => {
  try {
    const { user_id: teacher_id, school_id } = req.user;
    const { id } = req.params;
    const { name, age, gender, class_id, date_of_birth, parent_email, parent_phone } = req.body;

    // 1. Check student exists in school
    const studentCheck = await pool.query(
      `SELECT * FROM students WHERE id = $1 AND school_id = $2`,
      [id, school_id]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = studentCheck.rows[0];

    // 2. If class_id is being updated → validate it
    if (class_id) {
      const classExists = await checkClassBelongsToSchool(class_id, school_id);

      if (!classExists) {
        return res.status(404).json({
          message: "Class not found in your school"
        });
      }

      const isAssigned = await checkTeacherAssignment(teacher_id, class_id);

      if (!isAssigned) {
        return res.status(403).json({
          message: "You are not assigned to this class"
        });
      }
    }

    // 3. Update (partial update)
    const result = await pool.query(
      `UPDATE students
       SET name          = COALESCE($1, name),
           age           = COALESCE($2, age),
           gender        = COALESCE($3, gender),
           class_id      = COALESCE($4, class_id),
           date_of_birth = COALESCE($5, date_of_birth),
           parent_email  = COALESCE($6, parent_email),
           parent_phone  = COALESCE($7, parent_phone)
       WHERE id = $8 AND school_id = $9
       RETURNING *`,
      [name, age, gender, class_id, date_of_birth || null,
       parent_email || null, parent_phone || null,
       id, school_id]
    );

    return res.status(200).json({
      message: "Student updated successfully",
      student: result.rows[0]
    });

  } catch (err) {
    console.error("Update Student Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// =========================
// DELETE STUDENT (TEACHER ONLY)
// =========================
export const deleteStudent = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM students
       WHERE id = $1 AND school_id = $2
       RETURNING *`,
      [id, school_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({
      message: "Student deleted successfully"
    });

  } catch (err) {
    console.error("Delete Student Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================
// NOTIFY PARENT (Manual trigger)
// POST /api/student/:id/notify
// Manually re-send a malnutrition alert for a student.
// Only works if the student's latest health record is Critical or High Risk.
// Useful when contact info was added after the health record was saved.
// =========================
export const notifyParent = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id: student_id } = req.params;

    // 1. Fetch student with contact info (scoped to school)
    const studentRes = await pool.query(
      `SELECT s.*, c.name AS class_name, c.section
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1 AND s.school_id = $2`,
      [student_id, school_id]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const student = studentRes.rows[0];

    // 2. Check at least one contact exists
    if (!student.parent_email && !student.parent_phone) {
      return res.status(400).json({
        message: 'No parent contact information on file for this student. Update the student record with parent_email or parent_phone first.'
      });
    }

    // 3. Fetch latest health record and check it qualifies for an alert
    const healthRes = await pool.query(
      `SELECT bmi, who_category, recorded_at
       FROM health_records
       WHERE student_id = $1
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`,
      [student_id]
    );
    if (healthRes.rows.length === 0) {
      return res.status(400).json({
        message: 'No health records found for this student. Add a health record first.'
      });
    }

    const { bmi, who_category, recorded_at } = healthRes.rows[0];

    if (!ALERT_CATEGORIES.includes(who_category)) {
      return res.status(400).json({
        message: `No alert needed. Student's current status is '${toLabel(who_category) || who_category}'. Alerts are only sent for Critical and High Risk students.`
      });
    }

    // 4. Fetch RDA for this student's age group + gender
    const age      = student.age || 10;
    const gender   = (student.gender || 'male').toLowerCase();
    const ageGroup = age <= 8 ? '6-9' : age <= 11 ? '9-12' : age <= 14 ? '13-15' : '16-17';

    const rdaRes = await pool.query(
      `SELECT * FROM rda_reference WHERE age_group = $1 AND gender = $2`,
      [ageGroup, gender]
    );
    if (rdaRes.rows.length === 0) {
      return res.status(500).json({
        message: `No RDA reference data found for age group '${ageGroup}', gender '${gender}'. Run the RDA seeder first.`
      });
    }

    const rda       = rdaRes.rows[0];
    const className = student.class_name
      ? `${student.class_name}${student.section ? ' ' + student.section : ''}`
      : null;

    // 5. Send alert
    const notifResult = await sendMalnutritionAlert({
      studentName:  student.name,
      parentEmail:  student.parent_email,
      parentPhone:  student.parent_phone,
      whoCategory:  who_category,
      bmi,
      recordedAt:   recorded_at,
      rda,
      className,
    });

    // 6. Respond
    const allFailed =
      (student.parent_email && notifResult.email === 'error') &&
      (student.parent_phone && notifResult.sms   === 'error');

    if (allFailed) {
      return res.status(502).json({
        message: 'All notification channels failed',
        channels: { email: notifResult.email, sms: notifResult.sms },
        errors:   notifResult.errors,
      });
    }

    return res.status(200).json({
      message:    'Alert dispatched',
      student_id: parseInt(student_id),
      status:     toLabel(who_category),
      channels: {
        email: { status: notifResult.email, address: student.parent_email || null },
        sms:   { status: notifResult.sms,   phone:   student.parent_phone || null },
      },
      ...(notifResult.errors.length > 0 && { errors: notifResult.errors }),
    });

  } catch (err) {
    console.error('Notify Parent Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};