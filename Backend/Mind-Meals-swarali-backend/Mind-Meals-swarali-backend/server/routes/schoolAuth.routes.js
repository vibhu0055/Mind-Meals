import express from "express";
import {
  registerSchool,
  loginSchool
} from "../controllers/schoolAuth.controller.js";

const router = express.Router();

// register school
router.post("/register", registerSchool);

// login school
router.post("/login", loginSchool);

export default router;