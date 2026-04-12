import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectdb } from './database/connectdb.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes     from './routes/healthRoutes.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health',      healthRoutes);

// Health check
app.get('/', (req, res) => res.send('MealMind API running ✅'));

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