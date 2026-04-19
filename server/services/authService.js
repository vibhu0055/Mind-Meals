// =========================
// AUTH / AUTHORIZATION SERVICE
// =========================

import pool from "../database/database.js";

// Check if class belongs to school
export const checkClassBelongsToSchool = async (class_id, school_id) => {
  const result = await pool.query(
    `SELECT * FROM classes WHERE id = $1 AND school_id = $2`,
    [class_id, school_id]
  );

  return result.rows[0]; // returns class or undefined
};

// Check if teacher is assigned to class
export const checkTeacherAssignment = async (teacher_id, class_id) => {
  const result = await pool.query(
    `SELECT * FROM teacher_classes 
     WHERE teacher_id = $1 AND class_id = $2`,
    [teacher_id, class_id]
  );

  return result.rows.length > 0;
};

// Check if student belongs to school
export const checkStudentBelongsToSchool = async (student_id, school_id) => {
  const result = await pool.query(
    `SELECT * FROM students WHERE id = $1 AND school_id = $2`,
    [student_id, school_id]
  );

  return result.rows[0];
};