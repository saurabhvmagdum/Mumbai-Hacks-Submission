import axios, { AxiosInstance, AxiosResponse } from 'axios';
import config from '../config/config';
import logger from '../utils/logger';

export interface ForecastRequest {
  horizon_days: number;
  date?: string;
}

export interface ForecastResponse {
  predictions: Array<{
    date: string;
    predicted_volume: number;
    confidence_lower: number;
    confidence_upper: number;
  }>;
  model_version: string;
  generated_at: string;
}

export interface TriageRequest {
  patient_id: string;
  symptoms: string;
  vitals: {
    heart_rate?: number;
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    temperature?: number;
    respiratory_rate?: number;
    oxygen_saturation?: number;
  };
  age?: number;
  medical_history?: string[];
}

export interface TriageResponse {
  patient_id: string;
  acuity_level: number;
  acuity_label: string;
  confidence: number;
  risk_factors: string[];
  red_flags: string[];
  recommended_action: string;
  model_version: string;
}

export interface SchedulingRequest {
  forecast_data: ForecastResponse;
  staff_list: Array<{
    staff_id: string;
    name: string;
    role: string;
    max_hours_per_week: number;
    qualifications: string[];
    preferences?: any;
  }>;
  constraints: {
    min_staff_per_shift: Record<string, number>;
    shift_duration_hours: number;
  };
}

export interface SchedulingResponse {
  schedule: Array<{
    staff_id: string;
    date: string;
    shift: string;
    role: string;
  }>;
  metrics: {
    total_cost: number;
    coverage_percentage: number;
    fairness_score: number;
  };
  generated_at: string;
}

export interface DischargePlanningRequest {
  current_patients: Array<{
    patient_id: string;
    admission_date: string;
    diagnosis: string;
    vitals: any;
    procedures_completed: string[];
  }>;
}

export interface DischargePlanningResponse {
  discharge_candidates: Array<{
    patient_id: string;
    discharge_readiness_score: number;
    estimated_discharge_date: string;
    criteria_met: Record<string, boolean>;
    recommendations: string[];
  }>;
  generated_at: string;
}

class AgentsClient {
  private demandForecastClient: AxiosInstance;
  private staffSchedulingClient: AxiosInstance;
  private erorSchedulingClient: AxiosInstance;
  private dischargePlanningClient: AxiosInstance;
  private triageAcuityClient: AxiosInstance;

  constructor() {
    const timeout = 30000; // 30 seconds

    this.demandForecastClient = axios.create({
      baseURL: config.mlAgents.demandForecast,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.staffSchedulingClient = axios.create({
      baseURL: config.mlAgents.staffScheduling,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.erorSchedulingClient = axios.create({
      baseURL: config.mlAgents.erorScheduling,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.dischargePlanningClient = axios.create({
      baseURL: config.mlAgents.dischargePlanning,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.triageAcuityClient = axios.create({
      baseURL: config.mlAgents.triageAcuity,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    const clients = [
      this.demandForecastClient,
      this.staffSchedulingClient,
      this.erorSchedulingClient,
      this.dischargePlanningClient,
      this.triageAcuityClient,
    ];

    clients.forEach((client) => {
      client.interceptors.request.use(
        (config) => {
          logger.debug(`Calling ML agent: ${config.baseURL}${config.url}`);
          return config;
        },
        (error) => {
          logger.error('Request interceptor error', error);
          return Promise.reject(error);
        }
      );

      client.interceptors.response.use(
        (response) => {
          logger.debug(`ML agent response received: ${response.config.url}`, {
            status: response.status,
          });
          return response;
        },
        (error) => {
          logger.error('ML agent call failed', {
            url: error.config?.url,
            message: error.message,
          });
          return Promise.reject(error);
        }
      );
    });
  }

  // Demand Forecast Agent
  async getDemandForecast(request: ForecastRequest): Promise<ForecastResponse> {
    try {
      const response: AxiosResponse<ForecastResponse> = await this.demandForecastClient.post(
        '/predict',
        request
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get demand forecast', error);
      throw new Error('Demand Forecast Agent unavailable');
    }
  }

  async healthCheckDemandForecast(): Promise<boolean> {
    try {
      await this.demandForecastClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Triage & Acuity Agent
  async getTriageDecision(request: TriageRequest): Promise<TriageResponse> {
    try {
      const response: AxiosResponse<TriageResponse> = await this.triageAcuityClient.post(
        '/triage',
        request
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get triage decision', error);
      throw new Error('Triage Agent unavailable');
    }
  }

  async healthCheckTriage(): Promise<boolean> {
    try {
      await this.triageAcuityClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Staff Scheduling Agent
  async generateStaffSchedule(request: SchedulingRequest): Promise<SchedulingResponse> {
    try {
      const response: AxiosResponse<SchedulingResponse> = await this.staffSchedulingClient.post(
        '/schedule',
        request
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to generate staff schedule', error);
      throw new Error('Staff Scheduling Agent unavailable');
    }
  }

  async healthCheckScheduling(): Promise<boolean> {
    try {
      await this.staffSchedulingClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Discharge Planning Agent
  async getDischargeCandidates(
    request: DischargePlanningRequest
  ): Promise<DischargePlanningResponse> {
    try {
      const response: AxiosResponse<DischargePlanningResponse> =
        await this.dischargePlanningClient.post('/analyze', request);
      return response.data;
    } catch (error) {
      logger.error('Failed to get discharge candidates', error);
      throw new Error('Discharge Planning Agent unavailable');
    }
  }

  async healthCheckDischargePlanning(): Promise<boolean> {
    try {
      await this.dischargePlanningClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // ER/OR Scheduling Agent
  async getNextERPatient(): Promise<any> {
    try {
      const response = await this.erorSchedulingClient.get('/er/next-patient');
      return response.data;
    } catch (error) {
      logger.error('Failed to get next ER patient', error);
      throw new Error('ER/OR Scheduling Agent unavailable');
    }
  }

  async scheduleORCases(cases: any[]): Promise<any> {
    try {
      const response = await this.erorSchedulingClient.post('/or/schedule', { cases });
      return response.data;
    } catch (error) {
      logger.error('Failed to schedule OR cases', error);
      throw new Error('ER/OR Scheduling Agent unavailable');
    }
  }

  async healthCheckEROR(): Promise<boolean> {
    try {
      await this.erorSchedulingClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Health check for all agents
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const [demandForecast, triage, scheduling, dischargePlanning, eror] = await Promise.all([
      this.healthCheckDemandForecast(),
      this.healthCheckTriage(),
      this.healthCheckScheduling(),
      this.healthCheckDischargePlanning(),
      this.healthCheckEROR(),
    ]);

    return {
      demandForecast,
      triage,
      scheduling,
      dischargePlanning,
      eror,
    };
  }
}

export const agentsClient = new AgentsClient();
export default agentsClient;

