import express from "express";
import {
  createTeacher,
  deleteTeacher,
  loginTeacher,
  updateMealPermission
} from "../controllers/teacherController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// school creates teacher (protected)
router.post("/create", protect(["school"]), createTeacher);

// DELETE teacher (school only)
router.delete("/:id", protect(['school']), deleteTeacher);

// teacher login
router.post("/login", loginTeacher);

// Update meal permission (school only)
router.patch("/:id/meal-permission", protect(['school']), updateMealPermission);

export default router;