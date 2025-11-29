import cron from 'node-cron';
import supervisor from '../supervisor/supervisor';
import logger from '../utils/logger';
import config from '../config/config';

export class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  initialize(): void {
    if (!config.enableScheduledJobs) {
      logger.info('Scheduled jobs are disabled');
      return;
    }

    logger.info('Initializing scheduled jobs');

    // Daily workflow at 2:00 AM
    this.scheduleDailyWorkflow();

    // Agent health check every 5 minutes
    this.scheduleHealthCheck();

    // Discharge planning check every 6 hours
    this.scheduleDischargePlanningCheck();

    logger.info('All scheduled jobs initialized');
  }

  /**
   * Schedule daily workflow (forecast + scheduling)
   * Runs at 2:00 AM every day
   */
  private scheduleDailyWorkflow(): void {
    const job = cron.schedule('0 2 * * *', async () => {
      logger.info('Running scheduled daily workflow');
      try {
        await supervisor.runDailyWorkflow();
      } catch (error) {
        logger.error('Scheduled daily workflow failed', error);
      }
    });

    this.jobs.set('dailyWorkflow', job);
    logger.info('Daily workflow scheduled: 2:00 AM daily');
  }

  /**
   * Schedule health check for all agents
   * Runs every 5 minutes
   */
  private scheduleHealthCheck(): void {
    const job = cron.schedule('*/5 * * * *', async () => {
      logger.debug('Running scheduled health check');
      try {
        const health = await supervisor.checkAgentHealth();
        const unhealthyAgents = Object.entries(health)
          .filter(([_, isHealthy]) => !isHealthy)
          .map(([agent]) => agent);

        if (unhealthyAgents.length > 0) {
          logger.warn('Some agents are unhealthy', { unhealthyAgents });
          // TODO: Send alert notification
        }
      } catch (error) {
        logger.error('Scheduled health check failed', error);
      }
    });

    this.jobs.set('healthCheck', job);
    logger.info('Health check scheduled: every 5 minutes');
  }

  /**
   * Schedule discharge planning check
   * Runs every 6 hours
   */
  private scheduleDischargePlanningCheck(): void {
    const job = cron.schedule('0 */6 * * *', async () => {
      logger.info('Running scheduled discharge planning check');
      try {
        await supervisor.runDischargePlanning();
      } catch (error) {
        logger.error('Scheduled discharge planning check failed', error);
      }
    });

    this.jobs.set('dischargePlanning', job);
    logger.info('Discharge planning check scheduled: every 6 hours');
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    logger.info('Stopping all scheduled jobs');
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Get status of all jobs
   */
  getStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    this.jobs.forEach((_, name) => {
      status[name] = 'running';
    });
    return status;
  }
}

export const cronScheduler = new CronScheduler();
export default cronScheduler;

