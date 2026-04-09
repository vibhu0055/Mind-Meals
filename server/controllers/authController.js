import pool from '../database/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Helper: generate JWT
const generateToken = (id, role, email) => {
  return jwt.sign(
    { id, role, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper: find user by role
const findUserByEmail = async (email, role) => {
  const tableMap = {
    admin:     'admin',
    principal: 'principal',
    teacher:   'teacher',
    parent:    'parent',
  };

  const table = tableMap[role];
  if (!table) return null;

  let result;

  if (role === 'admin') {
    // admin table uses school_id as PK
    result = await pool.query(
      `SELECT school_id AS id, name, email, password_hash FROM admin WHERE email = $1`,
      [email]
    );
  } else {
    result = await pool.query(
      `SELECT id, name, email, password_hash FROM ${table} WHERE email = $1`,
      [email]
    );
  }

  return result.rows[0] || null;
};

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password and role are required.' });
  }

  const validRoles = ['admin', 'principal', 'teacher', 'parent'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  try {
    const user = await findUserByEmail(email, role);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user.id, role, user.email);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};