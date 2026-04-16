import express from "express";
import {
  createClass,
  getClasses,
  assignTeacherToClass
} from "../controllers/classController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ONLY SCHOOL
router.post("/create", protect(['school']), createClass);
router.post("/assign-teacher", protect(['school']), assignTeacherToClass);

// SCHOOL + TEACHER (view)
router.get("/", protect(['school', 'teacher']), getClasses);

export default router;