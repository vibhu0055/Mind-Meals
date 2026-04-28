import pool from '../database/database.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ message: 'email, password and role required' });

    if (role === 'school') {
      const { rows } = await pool.query('SELECT * FROM schools WHERE email = $1', [email]);
      const school = rows[0];
      if (!school) return res.status(404).json({ message: 'School not found' });
      if (!await bcrypt.compare(password, school.password_hash)) return res.status(401).json({ message: 'Invalid credentials' });
      const token = generateToken({ school_id: school.id, role: 'school' });
      return res.status(200).json({ token, user: { id: school.id, name: school.name, email: school.email, role: 'school' } });
    }

    if (role === 'teacher') {
      const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1 AND role = 'teacher'`, [email]);
      const teacher = rows[0];
      if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
      if (!await bcrypt.compare(password, teacher.password_hash)) return res.status(401).json({ message: 'Invalid credentials' });
      const token = generateToken({ user_id: teacher.id, school_id: teacher.school_id, role: 'teacher' });
      return res.status(200).json({ token, user: { id: teacher.id, name: teacher.name, email: teacher.email, role: 'teacher', school_id: teacher.school_id, can_manage_meals: teacher.can_manage_meals } });
    }

    return res.status(400).json({ message: 'role must be school or teacher' });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};