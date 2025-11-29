import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import config from './config/config';
import logger from './utils/logger';
import db from './database/db';
import routes from './routes';
import { authenticate } from './middleware/auth';
import cronScheduler from './scheduler/cronJobs';

class OrchestratorApp {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: '*', // Configure appropriately for production
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      })
    );

    // Body parsers
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Public health check
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'Swasthya Orchestrator',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
      });
    });

    // Protected API routes
    this.app.use('/api', authenticate, routes);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? err.message : 'An error occurred',
        timestamp: new Date().toISOString(),
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await db.initialize();
      logger.info('Database initialized');

      // Initialize scheduled jobs
      cronScheduler.initialize();

      // Start server
      this.app.listen(config.port, () => {
        logger.info(`Orchestrator listening on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info('Swasthya Orchestrator started successfully');
      });
    } catch (error) {
      logger.error('Failed to start orchestrator', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      cronScheduler.stopAll();
      await db.close();
      logger.info('Orchestrator stopped gracefully');
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  }
}

// Create and start the application
const orchestratorApp = new OrchestratorApp();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await orchestratorApp.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await orchestratorApp.stop();
  process.exit(0);
});

// Start the application
orchestratorApp.start();

export default orchestratorApp;

