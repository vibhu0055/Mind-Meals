import express from 'express';
import { connectdb } from './database/connectdb.js';

const app = express();
const PORT = 5000;

app.use(express.json());

const startServer = async () => {
  try {
    // Initialize DB
    await connectdb();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Server startup failed');
    process.exit(1);
  }
};

startServer();