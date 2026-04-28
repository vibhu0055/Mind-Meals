import express from 'express';
import {
  generateReport,
  generateClassReport,
  getReport,
  getStudentReports,
  getClassReports,
  getSchoolReports,
  getRDAReference,
} from '../controllers/nutriController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── RDA reference table (read-only) ──────────────────────────────────────────
router.get('/rda', protect(['school', 'teacher']), getRDAReference);

// ── Generate reports (calculate + save) ──────────────────────────────────────
// NOTE: class route MUST be registered before :student_id route
// otherwise Express matches 'class' as a student_id param
router.post('/report/class/:class_id/:meal_id', protect(['school', 'teacher']), generateClassReport);
router.post('/report/:student_id/:meal_id',     protect(['school', 'teacher']), generateReport);

// ── Fetch saved reports (no recalculation) ────────────────────────────────────
router.get('/report/:student_id/:meal_id',  protect(['school', 'teacher']), getReport);
router.get('/reports/student/:student_id',  protect(['school', 'teacher']), getStudentReports);
router.get('/reports/class/:class_id/:meal_id', protect(['school', 'teacher']), getClassReports);

// ── School-wide filter ────────────────────────────────────────────────────────
// ?status=deficient&nutrient=iron&meal_id=5&date=2025-06-02
router.get('/reports/school', protect(['school', 'teacher']), getSchoolReports);

export default router;