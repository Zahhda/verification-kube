import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database';
import { router } from './routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const WORKER_ID = process.env.WORKER_ID || 'worker-1';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Routes
app.use('/', router);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', worker: WORKER_ID });
});

// Start server
app.listen(PORT, () => {
  console.log(`[${WORKER_ID}] Verification service running on port ${PORT}`);
});