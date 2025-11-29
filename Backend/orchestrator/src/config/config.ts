import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface Config {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  mlAgents: {
    demandForecast: string;
    staffScheduling: string;
    erorScheduling: string;
    dischargePlanning: string;
    triageAcuity: string;
  };
  mlflow: {
    trackingUri: string;
  };
  apiKey: string;
  enableScheduledJobs: boolean;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'swasthya_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  mlAgents: {
    demandForecast: process.env.DEMAND_FORECAST_SERVICE_URL || 'http://localhost:8001',
    staffScheduling: process.env.STAFF_SCHEDULING_SERVICE_URL || 'http://localhost:8002',
    erorScheduling: process.env.EROR_SCHEDULING_SERVICE_URL || 'http://localhost:8003',
    dischargePlanning: process.env.DISCHARGE_PLANNING_SERVICE_URL || 'http://localhost:8004',
    triageAcuity: process.env.TRIAGE_ACUITY_SERVICE_URL || 'http://localhost:8005',
  },
  mlflow: {
    trackingUri: process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000',
  },
  apiKey: process.env.API_KEY || 'dev-api-key',
  enableScheduledJobs: process.env.ENABLE_SCHEDULED_JOBS === 'true',
};

export default config;

