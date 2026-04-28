import express from "express";
import {
  createClass,
  getClasses,
  assignTeacherToClass,
  updateClass,
  deleteClass
} from "../controllers/classController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ONLY SCHOOL
router.post("/create", protect(['school']), createClass);
router.post("/assign-teacher", protect(['school']), assignTeacherToClass);

//  (school only)
router.patch("/:id", protect(['school']), updateClass);
router.delete("/:id", protect(['school']), deleteClass);

// SCHOOL + TEACHER (view)
router.get("/", protect(['school', 'teacher']), getClasses);

export default router;