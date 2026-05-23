import pool from "../database/database.js";
import {
  checkClassBelongsToSchool,
  checkTeacherAssignment
} from "../services/authService.js";

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
    const { bmi_category } = req.query;

    // Valid BMI categories
    const VALID_BMI = ['Underweight', 'Normal', 'Overweight', 'Obese'];
    if (bmi_category && !VALID_BMI.includes(bmi_category)) {
      return res.status(400).json({
        message: `Invalid bmi_category. Must be one of: ${VALID_BMI.join(', ')}`
      });
    }

    const params = [school_id];
    // When filtering by BMI, use JOIN LATERAL (excludes students with no health record).
    // Without filter, use LEFT JOIN LATERAL (includes all students, hr.* is null if no record).
    const lateralJoin = bmi_category ? 'JOIN' : 'LEFT JOIN';
    let bmiFilter = '';
    if (bmi_category) {
      params.push(bmi_category);
      bmiFilter = `AND hr.bmi_category = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         s.*,
         c.name        AS class_name,
         c.level       AS class_level,
         hr.bmi        AS bmi,
         hr.bmi_category,
         hr.height_cm,
         hr.weight_kg,
         hr.recorded_at AS bmi_recorded_at
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       ${lateralJoin} LATERAL (
         SELECT bmi, bmi_category, height_cm, weight_kg, recorded_at
         FROM health_records
         WHERE student_id = s.id
         ORDER BY recorded_at DESC, id DESC
         LIMIT 1
       ) hr ON true
       WHERE s.school_id = $1 ${bmiFilter}
       ORDER BY s.id DESC`,
      params
    );

    return res.status(200).json({
      students:    result.rows,
      total:       result.rows.length,
      bmi_filter:  bmi_category || null,
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
    const { bmi_category } = req.query;

    const VALID_BMI = ['Underweight', 'Normal', 'Overweight', 'Obese'];
    if (bmi_category && !VALID_BMI.includes(bmi_category)) {
      return res.status(400).json({
        message: `Invalid bmi_category. Must be one of: ${VALID_BMI.join(', ')}`
      });
    }

    const params = [school_id, class_id];
    const lateralJoin = bmi_category ? 'JOIN' : 'LEFT JOIN';
    let bmiFilter = '';
    if (bmi_category) {
      params.push(bmi_category);
      bmiFilter = `AND hr.bmi_category = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         s.*,
         hr.bmi,
         hr.bmi_category,
         hr.height_cm,
         hr.weight_kg,
         hr.recorded_at AS bmi_recorded_at
       FROM students s
       ${lateralJoin} LATERAL (
         SELECT bmi, bmi_category, height_cm, weight_kg, recorded_at
         FROM health_records
         WHERE student_id = s.id
         ORDER BY recorded_at DESC, id DESC
         LIMIT 1
       ) hr ON true
       WHERE s.school_id = $1 AND s.class_id = $2 ${bmiFilter}
       ORDER BY s.id DESC`,
      params
    );

    return res.status(200).json({
      students:   result.rows,
      total:      result.rows.length,
      bmi_filter: bmi_category || null,
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
    const { name, age, gender, class_id } = req.body;

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
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           gender = COALESCE($3, gender),
           class_id = COALESCE($4, class_id)
       WHERE id = $5 AND school_id = $6
       RETURNING *`,
      [name, age, gender, class_id, id, school_id]
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