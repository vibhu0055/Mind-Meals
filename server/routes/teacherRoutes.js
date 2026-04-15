import express from "express";
import {
  createTeacher,
  loginTeacher
} from "../controllers/teacherController.js";

const router = express.Router();

// school creates teacher (protected later)
router.post("/create", createTeacher);

// teacher login
router.post("/login", loginTeacher);

export default router;