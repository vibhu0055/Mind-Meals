import express from 'express';
import {
  assignClassToGroup,
  getClassGroups,
  getGroupConfig,
} from '../controllers/classgroupController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public reference — no auth needed
router.get('/config', getGroupConfig);

// School assigns classes to groups
router.post('/assign', protect(['school']), assignClassToGroup);

// School and teacher can view mappings
router.get('/', protect(['school', 'teacher']), getClassGroups);

export default router;