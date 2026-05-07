// =============================================================
// NUTRITION CONTROLLER
// Handles all RDA comparison endpoints under /api/nutrition
// =============================================================

import pool from '../database/database.js';
import { generateStudentReport } from '../services/rdaService.js';

// ── helper: reshape a DB row into a clean nutrient_breakdown array ──────────
const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'iron', 'calcium'];

const reshapeRow = (r) => {
  const nutrient_breakdown = NUTRIENTS.map((n) => {
    const received = parseFloat(r[`received_${n}`] || 0);
    const rda      = parseFloat(r[`rda_${n}`]      || 0);
    const gap      = parseFloat(r[`gap_${n}`]      || 0);
    const pct      = rda > 0 ? received / rda : 1;
    const status   = pct < 0.90 ? 'deficient' : pct > 1.20 ? 'excess' : 'adequate';
    return { nutrient: n, received, rda, gap, status };
  });
  return nutrient_breakdown;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/nutrition/report/:student_id/:meal_id
// Generate (or regenerate) the RDA comparison report for ONE student + meal.
// Requires: meal must already be distributed.
// ─────────────────────────────────────────────────────────────────────────────
export const generateReport = async (req, res) => {
  try {
    const { student_id, meal_id } = req.params;
    const { school_id } = req.user;

    // Scope checks
    const studentCheck = await pool.query(
      `SELECT id FROM students WHERE id = $1 AND school_id = $2`,
      [student_id, school_id]
    );
    if (studentCheck.rows.length === 0)
      return res.status(404).json({ message: 'Student not found in your school' });

    const mealCheck = await pool.query(
      `SELECT id FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0)
      return res.status(404).json({ message: 'Meal not found in your school' });

    const report = await generateStudentReport(
      parseInt(student_id),
      parseInt(meal_id)
    );

    return res.status(200).json({ message: 'Report generated', report });

  } catch (err) {
    const safe = ['not found', 'not assigned', 'distribute first', 'group'];
    if (safe.some((s) => err.message.includes(s)))
      return res.status(400).json({ message: err.message });

    console.error('Generate Report Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/nutrition/report/class/:class_id/:meal_id
// Generate reports for ALL students in a class for a given meal.
// ─────────────────────────────────────────────────────────────────────────────
export const generateClassReport = async (req, res) => {
  try {
    const { class_id, meal_id } = req.params;
    const { school_id } = req.user;

    const classCheck = await pool.query(
      `SELECT id FROM classes WHERE id = $1 AND school_id = $2`,
      [class_id, school_id]
    );
    if (classCheck.rows.length === 0)
      return res.status(404).json({ message: 'Class not found in your school' });

    const mealCheck = await pool.query(
      `SELECT id FROM meals WHERE id = $1 AND school_id = $2`,
      [meal_id, school_id]
    );
    if (mealCheck.rows.length === 0)
      return res.status(404).json({ message: 'Meal not found in your school' });

    const students = await pool.query(
      `SELECT id FROM students WHERE class_id = $1 AND school_id = $2`,
      [class_id, school_id]
    );
    if (students.rows.length === 0)
      return res.status(404).json({ message: 'No students found in this class' });

    const reports = [];
    const errors  = [];

    for (const s of students.rows) {
      try {
        const report = await generateStudentReport(s.id, parseInt(meal_id));
        reports.push(report);
      } catch (err) {
        errors.push({ student_id: s.id, error: err.message });
      }
    }

    return res.status(200).json({
      message:  `Reports generated for ${reports.length} of ${students.rows.length} students`,
      class_id: parseInt(class_id),
      meal_id:  parseInt(meal_id),
      reports,
      errors:   errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error('Generate Class Report Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/nutrition/report/:student_id/:meal_id
// Fetch a previously generated report — NO recalculation.
// ─────────────────────────────────────────────────────────────────────────────
export const getReport = async (req, res) => {
  try {
    const { student_id, meal_id } = req.params;
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT snr.*, s.name AS student_name, m.name AS meal_name,
              m.served_date
       FROM student_nutrition_reports snr
       JOIN students s ON snr.student_id = s.id
       JOIN meals    m ON snr.meal_id    = m.id
       WHERE snr.student_id = $1
         AND snr.meal_id    = $2
         AND s.school_id    = $3`,
      [student_id, meal_id, school_id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({
        message: 'Report not found. Generate it first via POST /api/nutrition/report/:student_id/:meal_id',
      });

    const r = result.rows[0];
    return res.status(200).json({
      report: {
        student_id:        r.student_id,
        student_name:      r.student_name,
        meal_id:           r.meal_id,
        meal_name:         r.meal_name,
        
        served_date:       r.served_date,
        age_group:         r.age_group,
        gender:            r.gender,
        bmi_category:      r.bmi_category,
        bmi_flag:          r.bmi_flag,
        overall_status:    r.overall_status,
        generated_at:      r.generated_at,
        nutrient_breakdown: reshapeRow(r),
      },
    });

  } catch (err) {
    console.error('Get Report Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/nutrition/reports/student/:student_id
// All reports across all meals for one student (history view).
// ─────────────────────────────────────────────────────────────────────────────
export const getStudentReports = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { school_id  } = req.user;

    const sc = await pool.query(
      `SELECT id FROM students WHERE id = $1 AND school_id = $2`,
      [student_id, school_id]
    );
    if (sc.rows.length === 0)
      return res.status(404).json({ message: 'Student not found in your school' });

    const result = await pool.query(
      `SELECT snr.*, m.name AS meal_name, m.served_date
       FROM student_nutrition_reports snr
       JOIN meals m ON snr.meal_id = m.id
       WHERE snr.student_id = $1
       ORDER BY m.served_date DESC, snr.generated_at DESC`,
      [student_id]
    );

    return res.status(200).json({
      student_id: parseInt(student_id),
      count:      result.rows.length,
      reports:    result.rows.map((r) => ({
        meal_id:        r.meal_id,
        meal_name:      r.meal_name,
        
        served_date:    r.served_date,
        overall_status: r.overall_status,
        bmi_flag:       r.bmi_flag,
        generated_at:   r.generated_at,
        nutrient_breakdown: reshapeRow(r),
      })),
    });

  } catch (err) {
    console.error('Get Student Reports Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/nutrition/reports/class/:class_id/:meal_id
// All stored reports for a class + meal (read-only).
// ─────────────────────────────────────────────────────────────────────────────
export const getClassReports = async (req, res) => {
  try {
    const { class_id, meal_id } = req.params;
    const { school_id } = req.user;

    const result = await pool.query(
      `SELECT snr.*, s.name AS student_name
       FROM student_nutrition_reports snr
       JOIN students s ON snr.student_id = s.id
       WHERE s.class_id   = $1
         AND snr.meal_id  = $2
         AND s.school_id  = $3
       ORDER BY s.name ASC`,
      [class_id, meal_id, school_id]
    );

    return res.status(200).json({
      class_id: parseInt(class_id),
      meal_id:  parseInt(meal_id),
      count:    result.rows.length,
      reports:  result.rows.map((r) => ({
        student_id:     r.student_id,
        student_name:   r.student_name,
        age_group:      r.age_group,
        gender:         r.gender,
        bmi_category:   r.bmi_category,
        bmi_flag:       r.bmi_flag,
        overall_status: r.overall_status,
        generated_at:   r.generated_at,
        nutrient_breakdown: reshapeRow(r),
      })),
    });

  } catch (err) {
    console.error('Get Class Reports Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/nutrition/reports/school?status=deficient&nutrient=iron&meal_id=5
// School-wide filter — find all students matching a status + nutrient + meal.
// Query params (all optional):
//   status   = 'deficient' | 'adequate' | 'excess'
//   nutrient = 'calories' | 'protein' | 'iron' | 'calcium' | 'carbs' | 'fat' | 'fiber'
//   meal_id  = integer
//   date     = YYYY-MM-DD  (filters by served_date of the meal)
// ─────────────────────────────────────────────────────────────────────────────
export const getSchoolReports = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { status, nutrient, meal_id, date } = req.query;

    // Build dynamic WHERE clauses
    const conditions = ['s.school_id = $1'];
    const params     = [school_id];
    let   p          = 2;

    if (meal_id) {
      conditions.push(`snr.meal_id = $${p++}`);
      params.push(parseInt(meal_id));
    }
    if (date) {
      conditions.push(`m.served_date = $${p++}`);
      params.push(date);
    }

    // Nutrient + status filter: check the gap column
    // gap_<nutrient> < 0 = deficient, > rda*0.20 = excess
    if (status && nutrient) {
      const validNutrients = NUTRIENTS;
      const validStatuses  = ['deficient', 'adequate', 'excess'];
      if (!validNutrients.includes(nutrient))
        return res.status(400).json({ message: `Invalid nutrient. Choose from: ${validNutrients.join(', ')}` });
      if (!validStatuses.includes(status))
        return res.status(400).json({ message: `Invalid status. Choose from: ${validStatuses.join(', ')}` });

      if (status === 'deficient') {
        conditions.push(`snr.gap_${nutrient} < 0`);
      } else if (status === 'excess') {
        conditions.push(`snr.gap_${nutrient} > 0 AND snr.received_${nutrient} > snr.rda_${nutrient} * 1.20`);
      } else {
        // adequate: gap >= 0 AND not excess
        conditions.push(
          `snr.gap_${nutrient} >= 0 AND snr.received_${nutrient} <= snr.rda_${nutrient} * 1.20`
        );
      }
    } else if (status && !nutrient) {
      // Filter by overall_status
      const validStatuses = ['deficient', 'adequate', 'excess'];
      if (!validStatuses.includes(status))
        return res.status(400).json({ message: `Invalid status.` });
      conditions.push(`snr.overall_status = $${p++}`);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT
         snr.student_id, s.name AS student_name,
         s.class_id, c.name AS class_name,
         snr.meal_id, m.name AS meal_name, m.served_date,
         snr.age_group, snr.gender, snr.bmi_category, snr.bmi_flag,
         snr.overall_status, snr.generated_at,
         snr.received_calories, snr.rda_calories, snr.gap_calories,
         snr.received_protein,  snr.rda_protein,  snr.gap_protein,
         snr.received_iron,     snr.rda_iron,     snr.gap_iron,
         snr.received_calcium,  snr.rda_calcium,  snr.gap_calcium
       FROM student_nutrition_reports snr
       JOIN students s ON snr.student_id = s.id
       JOIN meals    m ON snr.meal_id    = m.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE ${whereClause}
       ORDER BY m.served_date DESC, s.name ASC`,
      params
    );

    return res.status(200).json({
      count:   result.rows.length,
      filters: { status, nutrient, meal_id, date },
      reports: result.rows,
    });

  } catch (err) {
    console.error('Get School Reports Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/nutrition/rda
// Return the full RDA reference table (useful for frontend display).
// ─────────────────────────────────────────────────────────────────────────────
export const getRDAReference = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM rda_reference ORDER BY age_group, gender`
    );
    return res.status(200).json({ rda_reference: result.rows });
  } catch (err) {
    console.error('Get RDA Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};