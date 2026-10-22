import { Router } from 'express';
import { checkDatabaseConnection } from '../../db/pool.js';
import { sendOk } from '../../utils/http.js';

export const healthRouter = Router();

/**
 * GET /api/health
 *
 * Lightweight health probe. Reports `up` when the database is reachable.
 */
healthRouter.get(
  '/',
  async (_req, res) => {
    const databaseUp = await checkDatabaseConnection();
    const body = {
      status: databaseUp ? 'ok' : 'degraded',
      database: databaseUp ? 'up' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    if (!databaseUp) {
      res.status(503).json({ success: false, data: body });
      return;
    }
    sendOk(res, body);
  },
);
