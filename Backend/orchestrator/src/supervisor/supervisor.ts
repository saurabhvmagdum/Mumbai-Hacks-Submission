import agentsClient, {
  ForecastRequest,
  ForecastResponse,
  TriageRequest,
  SchedulingRequest,
  DischargePlanningRequest,
} from '../agents/agentsClient';
import db from '../database/db';
import logger from '../utils/logger';

export interface WorkflowState {
  lastForecast?: ForecastResponse;
  lastSchedule?: any;
  lastDischargePlan?: any;
}

class SupervisorAgent {
  private state: WorkflowState = {};

  constructor() {
    logger.info('Supervisor Agent initialized');
  }

  /**
   * Daily workflow: Generate forecast -> Update staff schedule -> Check discharge candidates
   */
  async runDailyWorkflow(): Promise<void> {
    logger.info('Starting daily workflow');

    try {
      // Step 1: Generate demand forecast
      const forecast = await this.runDemandForecast(7);
      if (forecast) {
        this.state.lastForecast = forecast;
        await this.saveForecastToDatabase(forecast);
      }

      // Step 2: Generate staff schedule based on forecast
      if (this.state.lastForecast) {
        const schedule = await this.triggerStaffScheduling(this.state.lastForecast);
        if (schedule) {
          this.state.lastSchedule = schedule;
          await this.saveScheduleToDatabase(schedule);
        }
      }

      // Step 3: Check for discharge candidates
      const dischargePlan = await this.runDischargePlanning();
      if (dischargePlan) {
        this.state.lastDischargePlan = dischargePlan;
        await this.saveDischargePlanToDatabase(dischargePlan);
      }

      logger.info('Daily workflow completed successfully');
    } catch (error) {
      logger.error('Daily workflow failed', error);
      throw error;
    }
  }

  /**
   * Run demand forecast for specified horizon
   */
  async runDemandForecast(horizonDays: number = 7): Promise<ForecastResponse | null> {
    logger.info(`Triggering demand forecast for ${horizonDays} days`);

    try {
      const request: ForecastRequest = {
        horizon_days: horizonDays,
        date: new Date().toISOString().split('T')[0],
      };

      const forecast = await agentsClient.getDemandForecast(request);
      logger.info('Demand forecast generated successfully', {
        predictions: forecast.predictions.length,
        model_version: forecast.model_version,
      });

      return forecast;
    } catch (error) {
      logger.error('Failed to run demand forecast', error);
      // Fallback: use historical average or last known forecast
      return null;
    }
  }

  /**
   * Trigger staff scheduling based on forecast
   */
  async triggerStaffScheduling(forecast: ForecastResponse): Promise<any | null> {
    logger.info('Triggering staff scheduling');

    try {
      // Fetch staff list from database
      const staffResult = await db.query(
        'SELECT staff_id, name, role, max_hours_per_week, qualifications FROM staff WHERE active = true'
      );

      const staffList = staffResult.rows.map((row) => ({
        staff_id: row.staff_id,
        name: row.name,
        role: row.role,
        max_hours_per_week: row.max_hours_per_week,
        qualifications: row.qualifications || [],
      }));

      const request: SchedulingRequest = {
        forecast_data: forecast,
        staff_list: staffList,
        constraints: {
          min_staff_per_shift: {
            morning: 5,
            afternoon: 6,
            night: 4,
          },
          shift_duration_hours: 8,
        },
      };

      const schedule = await agentsClient.generateStaffSchedule(request);
      logger.info('Staff schedule generated successfully');

      return schedule;
    } catch (error) {
      logger.error('Failed to trigger staff scheduling', error);
      return null;
    }
  }

  /**
   * Run discharge planning analysis
   */
  async runDischargePlanning(): Promise<any | null> {
    logger.info('Running discharge planning analysis');

    try {
      // Fetch current inpatients
      const patientsResult = await db.query(`
        SELECT 
          patient_id, 
          admission_date, 
          diagnosis,
          vitals,
          procedures_completed
        FROM inpatients 
        WHERE discharge_date IS NULL
      `);

      const request: DischargePlanningRequest = {
        current_patients: patientsResult.rows,
      };

      const dischargePlan = await agentsClient.getDischargeCandidates(request);
      logger.info('Discharge plan generated', {
        candidates: dischargePlan.discharge_candidates.length,
      });

      return dischargePlan;
    } catch (error) {
      logger.error('Failed to run discharge planning', error);
      return null;
    }
  }

  /**
   * Handle new patient arrival and triage
   */
  async handleNewPatientArrival(patientData: TriageRequest): Promise<any> {
    logger.info(`Handling new patient arrival: ${patientData.patient_id}`);

    try {
      // Step 1: Get triage decision
      const triageDecision = await agentsClient.getTriageDecision(patientData);

      // Step 2: Log triage decision
      await this.saveTriageDecisionToDatabase(triageDecision);

      // Step 3: Update ER queue if applicable
      if (triageDecision.acuity_level >= 3) {
        await this.updateERQueue(patientData.patient_id, triageDecision);
      }

      logger.info('Patient triage completed', {
        patient_id: patientData.patient_id,
        acuity_level: triageDecision.acuity_level,
        acuity_label: triageDecision.acuity_label,
      });

      return triageDecision;
    } catch (error) {
      logger.error('Failed to handle new patient arrival', error);
      throw error;
    }
  }

  /**
   * Update ER queue with priority patient
   */
  private async updateERQueue(patientId: string, triageDecision: any): Promise<void> {
    try {
      await db.query(
        `INSERT INTO er_queue (patient_id, acuity_level, arrival_time, status)
         VALUES ($1, $2, NOW(), 'waiting')`,
        [patientId, triageDecision.acuity_level]
      );

      logger.info(`Patient ${patientId} added to ER queue with acuity ${triageDecision.acuity_level}`);
    } catch (error) {
      logger.error('Failed to update ER queue', error);
    }
  }

  /**
   * Get next patient from ER queue
   */
  async getNextERPatient(): Promise<any> {
    try {
      const nextPatient = await agentsClient.getNextERPatient();
      logger.info('Retrieved next ER patient', nextPatient);
      return nextPatient;
    } catch (error) {
      logger.error('Failed to get next ER patient', error);
      throw error;
    }
  }

  /**
   * Schedule OR cases
   */
  async scheduleORCases(cases: any[]): Promise<any> {
    logger.info(`Scheduling ${cases.length} OR cases`);

    try {
      const schedule = await agentsClient.scheduleORCases(cases);
      await this.saveORScheduleToDatabase(schedule);
      logger.info('OR cases scheduled successfully');
      return schedule;
    } catch (error) {
      logger.error('Failed to schedule OR cases', error);
      throw error;
    }
  }

  /**
   * Check health of all agents
   */
  async checkAgentHealth(): Promise<Record<string, boolean>> {
    logger.info('Checking health of all agents');
    const health = await agentsClient.healthCheckAll();
    logger.info('Agent health check completed', health);
    return health;
  }

  // Database save methods
  private async saveForecastToDatabase(forecast: ForecastResponse): Promise<void> {
    try {
      for (const prediction of forecast.predictions) {
        await db.query(
          `INSERT INTO forecasts (date, predicted_volume, confidence_lower, confidence_upper, model_version, generated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (date, generated_at) DO UPDATE 
           SET predicted_volume = EXCLUDED.predicted_volume`,
          [
            prediction.date,
            prediction.predicted_volume,
            prediction.confidence_lower,
            prediction.confidence_upper,
            forecast.model_version,
            forecast.generated_at,
          ]
        );
      }
      logger.info('Forecast saved to database');
    } catch (error) {
      logger.error('Failed to save forecast to database', error);
    }
  }

  private async saveScheduleToDatabase(schedule: any): Promise<void> {
    try {
      for (const shift of schedule.schedule) {
        await db.query(
          `INSERT INTO staff_schedules (staff_id, date, shift, role, generated_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [shift.staff_id, shift.date, shift.shift, shift.role]
        );
      }
      logger.info('Schedule saved to database');
    } catch (error) {
      logger.error('Failed to save schedule to database', error);
    }
  }

  private async saveDischargePlanToDatabase(dischargePlan: any): Promise<void> {
    try {
      for (const candidate of dischargePlan.discharge_candidates) {
        await db.query(
          `INSERT INTO discharge_recommendations (
            patient_id, readiness_score, estimated_discharge_date, 
            criteria_met, recommendations, generated_at
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            candidate.patient_id,
            candidate.discharge_readiness_score,
            candidate.estimated_discharge_date,
            JSON.stringify(candidate.criteria_met),
            JSON.stringify(candidate.recommendations),
            dischargePlan.generated_at,
          ]
        );
      }
      logger.info('Discharge plan saved to database');
    } catch (error) {
      logger.error('Failed to save discharge plan to database', error);
    }
  }

  private async saveTriageDecisionToDatabase(triage: any): Promise<void> {
    try {
      await db.query(
        `INSERT INTO triage_decisions (
          patient_id, acuity_level, acuity_label, confidence,
          risk_factors, red_flags, recommended_action, model_version, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          triage.patient_id,
          triage.acuity_level,
          triage.acuity_label,
          triage.confidence,
          JSON.stringify(triage.risk_factors),
          JSON.stringify(triage.red_flags),
          triage.recommended_action,
          triage.model_version,
        ]
      );
      logger.info('Triage decision saved to database');
    } catch (error) {
      logger.error('Failed to save triage decision to database', error);
    }
  }

  private async saveORScheduleToDatabase(schedule: any): Promise<void> {
    try {
      if (schedule.schedule) {
        for (const item of schedule.schedule) {
          await db.query(
            `INSERT INTO or_schedules (case_id, or_room, start_time, estimated_duration, generated_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [item.case_id, item.or_room, item.start_time, item.estimated_duration]
          );
        }
      }
      logger.info('OR schedule saved to database');
    } catch (error) {
      logger.error('Failed to save OR schedule to database', error);
    }
  }

  // Getter for current state
  getState(): WorkflowState {
    return this.state;
  }
}

export const supervisor = new SupervisorAgent();
export default supervisor;

