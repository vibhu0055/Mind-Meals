import express from 'express';
import {
  addHealthRecord,
  getHealthRecordsByStudent,
  getHealthRecordById,
  getLatestHealthRecord,
} from '../controllers/healthController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only teachers can add health records
router.post('/', protect(['teacher']), addHealthRecord);

// Teachers, admin, parent can view records
router.get('/student/:student_id', protect(['teacher', 'admin', 'principal', 'parent']), getHealthRecordsByStudent);
router.get('/latest/:student_id',  protect(['teacher', 'admin', 'principal', 'parent']), getLatestHealthRecord);
router.get('/:id',                 protect(['teacher', 'admin', 'principal']), getHealthRecordById);

export default router;