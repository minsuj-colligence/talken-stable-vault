import express from 'express';
import { createServer } from 'http';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { apyController } from './controllers/apyController.js';
import { defiLlamaService } from './services/defiLlamaService.js';
import { websocketService } from './services/websocketService.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Routes
app.get('/api/health', apyController.health);
app.get('/api/apy', apyController.getAllAPYs.bind(apyController));
app.get('/api/apy/:chain', apyController.getChainAPY.bind(apyController));
app.get('/api/strategies/:chain', apyController.getStrategies.bind(apyController));
app.get('/api/rebalance/:chain', apyController.getRebalanceRecommendations.bind(apyController));

// Initialize WebSocket
websocketService.initialize(server);

// Cron jobs
// Fetch DefiLlama data every 10 minutes (600 seconds)
cron.schedule('*/10 * * * *', async () => {
  logger.info('Running scheduled DefiLlama fetch');
  try {
    await defiLlamaService.fetchPools();
  } catch (error) {
    logger.error('Error in scheduled fetch:', error);
  }
});

// Initial fetch on startup
defiLlamaService.fetchPools().then(() => {
  logger.info('Initial DefiLlama data fetched');
});

// Start server
server.listen(PORT, () => {
  logger.info(`Yields backend running on port ${PORT}`);
  logger.info(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
  logger.info(`API endpoint: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  websocketService.shutdown();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  websocketService.shutdown();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
