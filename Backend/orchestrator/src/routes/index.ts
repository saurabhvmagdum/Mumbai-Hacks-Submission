import { Router } from 'express';
import supervisor from '../supervisor/supervisor';
import agentsClient from '../agents/agentsClient';
import cronScheduler from '../scheduler/cronJobs';
import logger from '../utils/logger';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'swasthya-orchestrator',
  });
});

/**
 * Check health of all ML agents
 */
router.get('/agents/health', async (req, res) => {
  try {
    const health = await supervisor.checkAgentHealth();
    const allHealthy = Object.values(health).every((h) => h);

    res.json({
      status: allHealthy ? 'healthy' : 'degraded',
      agents: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to check agent health', error);
    res.status(500).json({ error: 'Failed to check agent health' });
  }
});

/**
 * Trigger demand forecast
 */
router.post('/forecast/run', async (req, res) => {
  try {
    const { horizon_days = 7 } = req.body;
    logger.info(`Manual trigger: demand forecast for ${horizon_days} days`);

    const forecast = await supervisor.runDemandForecast(horizon_days);

    if (!forecast) {
      return res.status(500).json({ error: 'Failed to generate forecast' });
    }

    res.json({
      success: true,
      forecast,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to run forecast', error);
    res.status(500).json({ error: 'Failed to run forecast' });
  }
});

/**
 * Get latest forecast
 */
router.get('/forecast/latest', (req, res) => {
  const state = supervisor.getState();

  if (!state.lastForecast) {
    return res.status(404).json({ error: 'No forecast available' });
  }

  res.json({
    forecast: state.lastForecast,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Trigger staff scheduling
 */
router.post('/scheduling/run', async (req, res) => {
  try {
    logger.info('Manual trigger: staff scheduling');
    const state = supervisor.getState();

    if (!state.lastForecast) {
      return res.status(400).json({ error: 'No forecast available. Run forecast first.' });
    }

    const schedule = await supervisor.triggerStaffScheduling(state.lastForecast);

    if (!schedule) {
      return res.status(500).json({ error: 'Failed to generate schedule' });
    }

    res.json({
      success: true,
      schedule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to run scheduling', error);
    res.status(500).json({ error: 'Failed to run scheduling' });
  }
});

/**
 * Handle new patient triage
 */
router.post('/triage', async (req, res) => {
  try {
    const patientData = req.body;

    if (!patientData.patient_id || !patientData.symptoms) {
      return res.status(400).json({ error: 'Missing required patient data' });
    }

    logger.info(`Triage request for patient: ${patientData.patient_id}`);
    const triageDecision = await supervisor.handleNewPatientArrival(patientData);

    res.json({
      success: true,
      triage: triageDecision,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to process triage', error);
    res.status(500).json({ error: 'Failed to process triage' });
  }
});

/**
 * Get next ER patient
 */
router.get('/er/next-patient', async (req, res) => {
  try {
    const nextPatient = await supervisor.getNextERPatient();
    res.json({
      success: true,
      patient: nextPatient,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get next ER patient', error);
    res.status(500).json({ error: 'Failed to get next ER patient' });
  }
});

/**
 * Run discharge planning
 */
router.post('/discharge/run', async (req, res) => {
  try {
    logger.info('Manual trigger: discharge planning');
    const dischargePlan = await supervisor.runDischargePlanning();

    if (!dischargePlan) {
      return res.status(500).json({ error: 'Failed to generate discharge plan' });
    }

    res.json({
      success: true,
      discharge_plan: dischargePlan,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to run discharge planning', error);
    res.status(500).json({ error: 'Failed to run discharge planning' });
  }
});

/**
 * Schedule OR cases
 */
router.post('/or/schedule', async (req, res) => {
  try {
    const { cases } = req.body;

    if (!cases || !Array.isArray(cases)) {
      return res.status(400).json({ error: 'Invalid cases data' });
    }

    logger.info(`OR scheduling request for ${cases.length} cases`);
    const schedule = await supervisor.scheduleORCases(cases);

    res.json({
      success: true,
      schedule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to schedule OR cases', error);
    res.status(500).json({ error: 'Failed to schedule OR cases' });
  }
});

/**
 * Run complete daily workflow
 */
router.post('/workflow/daily', async (req, res) => {
  try {
    logger.info('Manual trigger: daily workflow');
    await supervisor.runDailyWorkflow();

    res.json({
      success: true,
      message: 'Daily workflow completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to run daily workflow', error);
    res.status(500).json({ error: 'Failed to run daily workflow' });
  }
});

/**
 * Get scheduler status
 */
router.get('/scheduler/status', (req, res) => {
  const status = cronScheduler.getStatus();
  res.json({
    status,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get supervisor state
 */
router.get('/state', (req, res) => {
  const state = supervisor.getState();
  res.json({
    state,
    timestamp: new Date().toISOString(),
  });
});

export default router;

