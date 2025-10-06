import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { logger } from '../utils/logger.js';
import { apyEngine } from './apyEngine.js';

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket connection');
      this.clients.add(ws);

      // Send initial data
      this.sendAPYUpdate(ws);

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Send updates every 30 seconds
    this.updateInterval = setInterval(() => {
      this.broadcastAPYUpdates();
    }, 30000);

    logger.info('WebSocket service initialized');
  }

  private async sendAPYUpdate(ws: WebSocket): Promise<void> {
    try {
      const apyData = await apyEngine.getAllVaultAPYs();

      const message = {
        type: 'apy_update',
        timestamp: Date.now(),
        data: apyData,
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      logger.error('Error sending APY update:', error);
    }
  }

  private async broadcastAPYUpdates(): Promise<void> {
    if (this.clients.size === 0) return;

    try {
      const apyData = await apyEngine.getAllVaultAPYs();

      const message = {
        type: 'apy_update',
        timestamp: Date.now(),
        data: apyData,
      };

      const payload = JSON.stringify(message);

      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });

      logger.debug(`Broadcast APY updates to ${this.clients.size} clients`);
    } catch (error) {
      logger.error('Error broadcasting APY updates:', error);
    }
  }

  shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.clients.forEach((client) => {
      client.close();
    });

    this.wss?.close();
    logger.info('WebSocket service shut down');
  }
}

export const websocketService = new WebSocketService();
