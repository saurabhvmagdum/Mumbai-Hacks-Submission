import {
  orchestratorApi,
  forecastApi,
  staffApi,
  erOrApi,
  dischargeApi,
  triageApi,
  flApi1,
  flApi2,
  backendApi,
} from './client'

// Types (align with backend Pydantic models where possible)
export interface AgentHealth {
  agent: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  lastCheck: string
  responseTime?: number
}

export interface ForecastData {
  date: string
  predicted: number
  upper_bound: number
  lower_bound: number
}

// Triage request/response aligned to backend curl structure
export interface VitalSigns {
  heart_rate: number
  blood_pressure_systolic: number
  blood_pressure_diastolic: number
  respiratory_rate: number
  temperature: number
  oxygen_saturation: number
}

export interface TriageRequest {
  patient_id?: string
  symptoms: string
  vital_signs: VitalSigns
  age?: number
  medical_history?: string[]
}

export interface TriageResponse {
  patient_id?: string
  acuity_level: number
  explanation?: string
  recommended_action: string
}

export interface Patient {
  id: string
  name?: string
  age?: number
  acuity_level?: number
  arrival_time?: string
  status?: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
  department?: string
  availability?: boolean
}

export interface Schedule {
  staff_id: string
  shifts: Array<{ date: string; start_time: string; end_time: string }>
}

export interface StaffScheduleRequest {
  forecast: Array<{ date: string; predicted_volume: number }>
  staff: Array<{
    staff_id: string
    name: string
    role: string
    max_hours_per_week: number
  }>
  constraints: {
    min_staff_per_shift: number
    max_consecutive_days: number
  }
}

export interface DischargeAnalysis {
  patient_id: string
  readiness_score: number
  estimated_discharge_date: string
  explanation?: string
  status: 'ready' | 'not_ready' | 'needs_review'
}

export interface FLRound {
  round_id: string
  status: string
  participants: number
  metrics?: { accuracy?: number; loss?: number }
  timestamp: string
}

// Auth endpoints (backend routes)
export const authEndpoints = {
  login: (data: { aadhaar_number: string; password: string }) =>
    backendApi.post<{ token: string; user: any }>('/api/auth/login', data),
  register: (data: { aadhaar_number: string; password: string; role: string; name: string }) =>
    backendApi.post<{ message: string; user: any }>('/api/auth/register', data),
  getMe: () => backendApi.get<{ user: any }>('/api/auth/me'),
}

// Dashboard endpoints (backend routes)
export const dashboardEndpoints = {
  getPatientDashboard: () => backendApi.get('/api/dashboard/patient'),
  getHospitalDashboard: () => backendApi.get('/api/dashboard/hospital'),
  getAdminDashboard: () => backendApi.get('/api/dashboard/admin'),
}

// Orchestrator endpoints (routes are mapped from file1 router)
// Note: These now call orchestrator service directly and follow the curl testing guide
export const orchestratorEndpoints = {
  // Test 1
  getHealth: () => orchestratorApi.get('/health'),

  // Test 2
  getAgentHealth: () => orchestratorApi.get<AgentHealth[]>('/api/agents/health'),

  // Test 3
  // NOTE:
  // - The Node backend (`server.js`) exposes a compatibility route POST /forecast/run
  // - The separate orchestrator service may NOT expose this route on the same path,
  //   which led to 404 errors when calling it via `orchestratorApi`.
  // - To ensure the Demand Forecast page always works, we call the backend directly.
  runForecast: (horizon_days: number = 7) =>
    backendApi.post('/forecast/run', { horizon_days }),

  // Test 4
  getLatestForecast: () => orchestratorApi.get('/forecast/latest'),

  // Test 5
  triggerStaffScheduling: () => orchestratorApi.post('/api/scheduling/run'),

  // Test 6
  triggerTriage: (data: TriageRequest) => orchestratorApi.post('/api/triage', data),

  // Test 7
  getNextErPatient: () => orchestratorApi.get('/api/er/next-patient'),

  // Test 8
  runDischargePlanning: () => orchestratorApi.post('/api/discharge/run'),

  // Test 9
  scheduleOrCases: (data: {
    cases: Array<{
      patient_id: string
      procedure: string
      duration_minutes: number
      priority: number
      surgeon_id: string
    }>
  }) => orchestratorApi.post('/api/or/schedule', data),

  // Test 10 + 50
  runDailyWorkflow: () => orchestratorApi.post('/api/workflow/daily'),

  // Test 11
  getSchedulerStatus: () => orchestratorApi.get('/api/scheduler/status'),

  // Test 12
  getState: () => orchestratorApi.get('/api/state'),
}

// Forecast agent endpoints
// Aligned to Demand Forecast Agent curl structure
export const forecastEndpoints = {
  predict: async (days: number = 7) => {
    try {
      return await forecastApi.post<ForecastData[]>('/predict', { horizon_days: days })
    } catch (error) {
      console.warn('Forecast agent unavailable, using backend API')
      // Fallback to backend compat forecast run
      return backendApi.post('/forecast/run', { horizon_days: days })
    }
  },
  train: async (data: {
    model_type: string
    training_data: Array<{ date: string; volume: number }>
  }) => {
    try {
      return await forecastApi.post('/train', data)
    } catch (error) {
      console.warn('Forecast agent unavailable, using orchestrator API')
      // No direct orchestrator fallback defined in curl; rethrow
      throw error
    }
  },
  modelInfo: async () => {
    try {
      return await forecastApi.get('/model/info')
    } catch (error) {
      console.warn('Forecast agent unavailable, using backend API')
      return backendApi.get('/api/forecast/model/info')
    }
  },
  reload: async () => {
    try {
      return await forecastApi.post('/reload')
    } catch (error) {
      console.warn('Forecast agent unavailable, using backend API')
      return backendApi.post('/api/forecast/reload')
    }
  },
}

// Triage agent endpoints
export const triageEndpoints = {
  triage: async (data: TriageRequest) => {
    try {
      return await triageApi.post<TriageResponse>('/triage', data)
    } catch (error) {
      console.warn('Triage agent unavailable, using backend API')
      return backendApi.post<TriageResponse>('/api/triage', data)
    }
  },
  batchTriage: async (data: { patients: TriageRequest[] }) => {
    try {
      return await triageApi.post<TriageResponse[]>('/batch-triage', data)
    } catch (error) {
      console.warn('Triage agent unavailable, using backend API')
      // Fallback: process individually
      const results = await Promise.all(
        data.patients.map((d) => backendApi.post<TriageResponse>('/api/triage', d))
      )
      return { data: results.map(r => r.data) }
    }
  },
  health: async () => {
    try {
      return await triageApi.get('/health')
    } catch (error) {
      return backendApi.get('/health')
    }
  },
  acuityLevels: async () => {
    try {
      return await triageApi.get('/acuity-levels')
    } catch (error) {
      return { data: [1, 2, 3, 4, 5] }
    }
  },
  // Nurse override (Test 39)
  override: async (data: {
    patient_id: string
    ai_acuity: number
    nurse_acuity: number
    nurse_id: string
    reason: string
  }) => {
    return triageApi.post('/override', data)
  },
  modelInfo: async () => {
    return triageApi.get('/model/info')
  },
}

// ER/OR agent endpoints
// Note: These use backendApi since ER/OR agent service (port 8003) may not be running
export const erOrEndpoints = {
  // Test 24
  addPatient: async (data: {
    patient_id: string
    acuity_level: number
    arrival_time: string
    chief_complaint: string
  }) => {
    try {
      return await erOrApi.post<Patient>('/er/add-patient', data)
    } catch (error) {
      console.warn('ER/OR agent unavailable, using backend API')
      return backendApi.post<Patient>('/api/eror/patient', data)
    }
  },
  getNextPatient: async () => {
    try {
      return await erOrApi.get<Patient>('/er/next-patient')
    } catch (error) {
      console.warn('ER/OR agent unavailable, using backend API')
      return backendApi.get<Patient>('/api/eror/next')
    }
  },
  getERQueue: async () => {
    try {
      return await erOrApi.get<Patient[]>('/er/queue')
    } catch (error) {
      console.warn('ER/OR agent unavailable, using backend API')
      return backendApi.get<Patient[]>('/api/eror/queue')
    }
  },
  // Test 27
  scheduleOR: async (data: {
    cases: Array<{
      patient_id: string
      procedure: string
      duration_minutes: number
      priority: number
      surgeon_id: string
      required_equipment?: string[]
    }>
    rooms: Array<{
      room_id: string
      available_from: string
      available_until: string
    }>
  }) => {
    try {
      return await erOrApi.post('/or/schedule', data)
    } catch (error) {
      console.warn('ER/OR agent unavailable, using backend API')
      return backendApi.post('/api/eror/schedule', data)
    }
  },
  // Test 28
  getORSchedule: async (date: string) => {
    try {
      return await erOrApi.get(`/or/schedule?date=${encodeURIComponent(date)}`)
    } catch (error) {
      console.warn('ER/OR agent unavailable, using backend API')
      return backendApi.get('/api/eror/schedule')
    }
  },
}

// Staff scheduling agent endpoints
export const staffEndpoints = {
  getStaff: async () => {
    try {
      return await staffApi.get<StaffMember[]>('/staff')
    } catch (error) {
      console.warn('Staff agent unavailable, using backend API')
      // Return mock staff data
      return {
        data: [
          { id: '1', name: 'Dr. Smith', role: 'Doctor', department: 'Emergency', availability: true },
          { id: '2', name: 'Nurse Johnson', role: 'Nurse', department: 'Emergency', availability: true },
          { id: '3', name: 'Dr. Williams', role: 'Doctor', department: 'Surgery', availability: true },
        ]
      }
    }
  },
  // Test 19
  generateSchedule: async (data: StaffScheduleRequest) => {
    return staffApi.post('/schedule', data)
  },
  // Test 20
  getDefaultConstraints: async () => {
    return staffApi.get('/constraints/default')
  },
  // Test 21
  validateSchedule: async (data: {
    schedule: Array<{ staff_id: string; date: string; shift: string }>
  }) => {
    return staffApi.post('/schedule/validate', data)
  },
}

// Discharge agent endpoints
export const dischargeEndpoints = {
  // Test 31
  analyzeAll: async (data: {
    patients: Array<{
      patient_id: string
      admission_date: string
      diagnosis: string
      days_since_admission: number
      clinical_stability_score: number
      vital_signs_stable: boolean
      treatment_complete: boolean
      home_support_available: boolean
    }>
  }) => {
    return dischargeApi.post<DischargeAnalysis[]>('/analyze', data)
  },
  // Test 32
  analyzeSingle: async (data: {
    patient_id: string
    admission_date: string
    diagnosis: string
    days_since_admission: number
    clinical_stability_score: number
    vital_signs_stable: boolean
    treatment_complete: boolean
    home_support_available: boolean
    age: number
    comorbidities: string[]
  }) => {
    return dischargeApi.post<DischargeAnalysis>('/analyze-single', data)
  },
  health: async () => {
    try {
      return await dischargeApi.get('/health')
    } catch (error) {
      return backendApi.get('/health')
    }
  },
  criteria: async () => dischargeApi.get('/criteria'),
  modelInfo: async () => dischargeApi.get('/model/info'),
}

// Federated Learning endpoints
export const flEndpoints = {
  startRound: (server: 1 | 2) => {
    const api = server === 1 ? flApi1 : flApi2
    return api.post<FLRound>('/fl/start-round')
  },
  getStatus: (server: 1 | 2) => {
    const api = server === 1 ? flApi1 : flApi2
    return api.get<FLRound>('/fl/status')
  },
  getHistory: (server: 1 | 2) => {
    const api = server === 1 ? flApi1 : flApi2
    return api.get<FLRound[]>('/fl/history')
  },
  getClients: (server: 1 | 2) => {
    const api = server === 1 ? flApi1 : flApi2
    return api.get<{ client_id: string; status: string }[]>('/fl/clients')
  },
}


