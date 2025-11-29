import { Request, Response, NextFunction } from 'express';
import config from '../config/config';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  authenticated?: boolean;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== config.apiKey) {
    logger.warn('Unauthorized access attempt', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.authenticated = true;
  next();
};

