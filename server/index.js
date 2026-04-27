import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import { connectdb } from './database/connectdb.js';
import teacherRoutes from './routes/teacherRoutes.js';
import studentRoutes from "./routes/studentRoutes.js";
import healthRoutes from './routes/healthRoutes.js';
import classRoutes from './routes/classRoutes.js';
import ingredientRoutes from './routes/ingredientRoutes.js';
import classGroupRoutes from './routes/classgroupRoutes.js';
import mealRoutes from './routes/mealRoutes.js';
import nutritionRoutes from './routes/nutriRoutes.js';

// school auth routes
import schoolAuthRoutes from './routes/schoolAuth.routes.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set');
  process.exit(1);
}


const app = express();
const PORT = process.env.PORT || 5000;

// =========================
// MIDDLEWARE
// =========================
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// =========================
// ROUTES
// =========================

app.use('/api/auth', authRoutes);
app.use('/api/school', schoolAuthRoutes);
app.use('/api/teacher', teacherRoutes);
app.use("/api/student", studentRoutes);
app.use('/api/health', healthRoutes);
app.use("/api/class", classRoutes);
app.use('/api/ingredient', ingredientRoutes);
app.use('/api/class-group', classGroupRoutes);
app.use('/api/meal', mealRoutes);
app.use('/api/nutrition', nutritionRoutes);
// =========================
// HEALTH CHECK 
// =========================
app.get('/', (req, res) => {
  res.send('MealMind API running ✅');
});

// =========================
// START SERVER
// =========================
const startServer = async () => {
  try {
    await connectdb();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
};


startServer();