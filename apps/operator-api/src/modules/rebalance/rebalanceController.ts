import type { Request, Response } from 'express';
import { rebalanceService } from './rebalanceService.js';
import { logger } from '../../common/logger.js';

export class RebalanceController {
  /**
   * POST /api/rebalance
   * Execute rebalance for a vault
   */
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { chain, vaultAddress, strategies } = req.body;

      if (!chain || !vaultAddress || !strategies) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: chain, vaultAddress, strategies',
        });
        return;
      }

      const result = await rebalanceService.executeRebalance({
        chain,
        vaultAddress,
        strategies,
      });

      res.json(result);
    } catch (error) {
      logger.error('Rebalance execution error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/rebalance/status/:chain
   * Check if rebalance is needed
   */
  async checkStatus(req: Request, res: Response): Promise<void> {
    try {
      const { chain } = req.params;

      if (!['arbitrum', 'solana', 'bsc'].includes(chain)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain',
        });
        return;
      }

      const shouldRebalance = await rebalanceService.shouldRebalance(chain as any);

      res.json({
        success: true,
        chain,
        shouldRebalance,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Status check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check rebalance status',
      });
    }
  }
}

export const rebalanceController = new RebalanceController();
