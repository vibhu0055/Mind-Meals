import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "meal_mind_secret_key";

export const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};