import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import terrainsRouter from './routes/terrains.js';
import statsRouter from './routes/stats.js';
import chatRouter from './routes/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if it exists (local dev). On Railway, env vars are set in dashboard.
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const app = express();
const PORT = process.env.PORT || 3007;

// Global middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(authMiddleware);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'worms-rpg',
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/terrains', terrainsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/chat', chatRouter);

// Serve static frontend (production — vite builds to ../dist)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Worms RPG backend running on port ${PORT}`);
  console.log(`Anthropic API: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing'}`);
});
