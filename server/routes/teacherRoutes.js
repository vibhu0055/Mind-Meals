import express from "express";
import {
  createTeacher,
  loginTeacher
} from "../controllers/teacherController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// school creates teacher (protected)
router.post("/create", protect(["school"]), createTeacher);

// teacher login
router.post("/login", loginTeacher);

export default router;