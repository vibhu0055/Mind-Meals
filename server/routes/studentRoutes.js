import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addStudent,
  getStudents,
  getStudentsByClass,
  getStudentById,
  updateStudent,
  deleteStudent
} from "../controllers/studentController.js";

const router = express.Router();

// CREATE
router.post("/add", protect(['teacher']), addStudent);

//Update
router.patch('/:id', protect(['teacher']), updateStudent);
//Delete
router.delete('/:id', protect(['teacher']), deleteStudent);

// READ
router.get("/", protect(['teacher', 'school']), getStudents);
router.get("/class/:class_id", protect(['teacher', 'school']), getStudentsByClass);
router.get("/:id", protect(['teacher', 'school']), getStudentById);

export default router;