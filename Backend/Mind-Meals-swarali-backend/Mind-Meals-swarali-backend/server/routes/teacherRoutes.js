import express from "express";
import {
  createTeacher,
  deleteTeacher,
  loginTeacher,
  updateMealPermission,
  getTeachers,
  getTeacherProfile
} from "../controllers/teacherController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// school creates teacher
router.post("/create", protect(["school"]), createTeacher);

// DELETE teacher (school only)
router.delete("/:id", protect(['school']), deleteTeacher);

// teacher login
router.post("/login", loginTeacher);

// Update meal permission (school only)
router.patch("/:id/meal-permission", protect(['school']), updateMealPermission);

// ✅ NEW

// get all teachers (school only)
router.get("/", protect(['school']), getTeachers);

// get own profile (teacher only)
router.get("/me", protect(['teacher']), getTeacherProfile);

export default router;