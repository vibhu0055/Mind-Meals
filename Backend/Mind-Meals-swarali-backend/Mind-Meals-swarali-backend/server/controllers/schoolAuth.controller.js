    import pool from "../database/database.js";
    import bcrypt from "bcrypt";
    import { generateToken } from "../utils/jwt.js";

    /* =========================
    REGISTER SCHOOL
    ========================= */
    export const registerSchool = async (req, res) => {
  try {
    const { name, school_id, email, password } = req.body;

    // validation
    if (!name || !school_id || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // check if exists
    const existing = await pool.query(
      "SELECT * FROM schools WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "School already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert school (FIXED PARAMS)
    const result = await pool.query(
      `INSERT INTO schools (name, school_id, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email`,
      [name, school_id, email, hashedPassword]
    );

    return res.status(201).json({
      message: "School registered successfully",
      school: result.rows[0]
    });

  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

    /* =========================
    LOGIN SCHOOL
    ========================= */
    export const loginSchool = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
        }

        // find school
        const result = await pool.query(
        "SELECT * FROM schools WHERE email = $1",
        [email]
        );

        const school = result.rows[0];

        if (!school) {
        return res.status(404).json({ message: "School not found" });
        }

        // check password
        const isMatch = await bcrypt.compare(password, school.password_hash);

        if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
        }

        // generate token
        const token = generateToken({
        school_id: school.id,
        role: "school"
        });

        return res.status(200).json({
        message: "Login successful",
        token,
        school: {
            id: school.id,
            name: school.name,
            email: school.email
        }
        });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
    };