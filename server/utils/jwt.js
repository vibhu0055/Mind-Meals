import jwt from 'jsonwebtoken';

const getSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
};

export const generateToken = (payload) => jwt.sign(payload, getSecret(), { expiresIn: '7d' });
export const verifyToken = (token) => jwt.verify(token, getSecret());