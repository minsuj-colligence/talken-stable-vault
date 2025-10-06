import express from 'express';
import dotenv from 'dotenv';
import { rebalanceController } from './modules/rebalance/rebalanceController.js';
import { logger } from './common/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    service: 'operator-api',
    version: '1.0.0',
    timestamp: Date.now(),
  });
});

// Rebalance routes
app.post('/api/rebalance', rebalanceController.execute.bind(rebalanceController));
app.get(
  '/api/rebalance/status/:chain',
  rebalanceController.checkStatus.bind(rebalanceController)
);

// Pause/unpause (admin only)
app.post('/api/pause/:chain', (req, res) => {
  const { chain } = req.params;
  logger.warn(`Pause requested for ${chain}`);
  res.json({
    success: true,
    message: `Paused ${chain} operations`,
  });
});

app.post('/api/unpause/:chain', (req, res) => {
  const { chain } = req.params;
  logger.info(`Unpause requested for ${chain}`);
  res.json({
    success: true,
    message: `Unpaused ${chain} operations`,
  });
});

// Allocations info
app.get('/api/allocations/:chain', async (req, res) => {
  const { chain } = req.params;
  // In production, fetch from contract
  res.json({
    success: true,
    chain,
    allocations: [],
    timestamp: Date.now(),
  });
});

// Yields info (proxy to yields-backend)
app.get('/api/yields/:chain', async (req, res) => {
  const { chain } = req.params;
  // Proxy to yields-backend
  res.json({
    success: true,
    chain,
    yields: [],
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Operator API running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});
