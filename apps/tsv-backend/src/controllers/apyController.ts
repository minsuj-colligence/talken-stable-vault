import type { Request, Response } from 'express';
import { apyEngine } from '../services/apyEngine.js';
import { defiLlamaService } from '../services/defiLlamaService.js';
import { logger } from '../utils/logger.js';

export class APYController {
  /**
   * GET /api/apy
   * Get all vault APYs
   */
  async getAllAPYs(req: Request, res: Response): Promise<void> {
    try {
      const apys = await apyEngine.getAllVaultAPYs();
      res.json({
        success: true,
        data: apys,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error getting APYs:', error);
      logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      logger.error('Error message:', error instanceof Error ? error.message : String(error));
      res.status(500).json({
        success: false,
        error: 'Failed to fetch APYs',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * GET /api/apy/:chain
   * Get APY for specific chain
   */
  async getChainAPY(req: Request, res: Response): Promise<void> {
    try {
      const { chain } = req.params;

      if (!['arbitrum', 'ethereum', 'base', 'plasma', 'solana', 'bsc'].includes(chain)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain. Must be arbitrum, ethereum, base, plasma, solana, or bsc',
        });
        return;
      }

      const chainMap: Record<string, { vaultId: string; asset: string }> = {
        // Actual vaults
        ethereum: { vaultId: 'ethereum-usdt', asset: 'USDT' },
        solana: { vaultId: 'solana-usdc', asset: 'USDC' },
        bsc: { vaultId: 'bsc-usdt', asset: 'USDT' },
        // Bridge chains (route to Ethereum vault via LayerZero)
        arbitrum: { vaultId: 'arbitrum-bridge', asset: 'USDT' },
        base: { vaultId: 'base-bridge', asset: 'USDC' },
        plasma: { vaultId: 'plasma-bridge', asset: 'USDT' },
      };

      const { vaultId, asset } = chainMap[chain];

      const apy = await apyEngine.getVaultAPY(vaultId, chain as any, asset);

      res.json({
        success: true,
        data: apy,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error getting chain APY:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chain APY',
      });
    }
  }

  /**
   * GET /api/strategies/:chain
   * Get top strategies for chain
   */
  async getStrategies(req: Request, res: Response): Promise<void> {
    try {
      const { chain } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!['arbitrum', 'ethereum', 'base', 'plasma', 'solana', 'bsc'].includes(chain)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain',
        });
        return;
      }

      const strategies = await defiLlamaService.getTopStrategies(chain as any, limit);

      res.json({
        success: true,
        data: strategies,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error getting strategies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch strategies',
      });
    }
  }

  /**
   * GET /api/rebalance/:chain
   * Get rebalance recommendations
   */
  async getRebalanceRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { chain } = req.params;
      const tvl = parseFloat(req.query.tvl as string) || 1000000;

      if (!['arbitrum', 'ethereum', 'base', 'plasma', 'solana', 'bsc'].includes(chain)) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain',
        });
        return;
      }

      const recommendations = await defiLlamaService.getRebalanceRecommendations(
        chain as any,
        tvl
      );

      res.json({
        success: true,
        data: recommendations,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error getting rebalance recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendations',
      });
    }
  }

  /**
   * GET /api/health
   * Health check
   */
  health(req: Request, res: Response): void {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: Date.now(),
    });
  }
}

export const apyController = new APYController();
