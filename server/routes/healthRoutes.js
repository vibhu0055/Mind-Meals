import express from 'express';
import {
  addHealthRecord,
  getHealthRecordsByStudent,
  getHealthRecordById,
  getLatestHealthRecord,
  updateHealthRecord,
  deleteHealthRecord
} from '../controllers/healthController.js';

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Teacher adds health record
router.post('/', protect(['teacher']), addHealthRecord);

// ✅ NEW (teacher only)
router.patch('/:id', protect(['teacher']), updateHealthRecord);
router.delete('/:id', protect(['teacher']), deleteHealthRecord);

// View records
router.get('/student/:student_id', protect(['teacher', 'school']), getHealthRecordsByStudent);
router.get('/latest/:student_id', protect(['teacher', 'school']), getLatestHealthRecord);
router.get('/:id', protect(['teacher', 'school']), getHealthRecordById);

export default router;