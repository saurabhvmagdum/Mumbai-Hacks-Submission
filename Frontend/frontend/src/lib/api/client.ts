import axios, { AxiosInstance } from 'axios'

// Base URLs (Vite exposes VITE_* env vars to the browser)
// Orchestrator runs on port 3000 by default (matches curl testing guide)
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'http://localhost:3000'
const FORECAST_AGENT_URL = import.meta.env.VITE_FORECAST_AGENT_URL || 'http://localhost:8001'
const STAFF_AGENT_URL = import.meta.env.VITE_STAFF_AGENT_URL || 'http://localhost:8002'
const ER_OR_AGENT_URL = import.meta.env.VITE_ER_OR_AGENT_URL || 'http://localhost:8003'
const DISCHARGE_AGENT_URL = import.meta.env.VITE_DISCHARGE_AGENT_URL || 'http://localhost:8004'
const TRIAGE_AGENT_URL = import.meta.env.VITE_TRIAGE_AGENT_URL || 'http://localhost:8005'
const FL_SERVER_1_URL = import.meta.env.VITE_FL_SERVER_1_URL || 'http://localhost:8086'
const FL_SERVER_2_URL = import.meta.env.VITE_FL_SERVER_2_URL || 'http://localhost:8087'
const MLFLOW_URL = import.meta.env.VITE_MLFLOW_URL || 'http://localhost:5000'

// Backend API URL (for auth and dashboard routes)
// Default to localhost:3000 if not set (matches backend/orchestrator server)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Orchestrator API key (used for all /api/* orchestrator routes)
const ORCHESTRATOR_API_KEY =
  import.meta.env.VITE_ORCHESTRATOR_API_KEY ||
  import.meta.env.VITE_API_KEY ||
  'dev-api-key'

// Helper: try to read auth token (works in browser)
const getAuthToken = (): string | null => {
  try {
    if (typeof window !== 'undefined') {
      // Check both 'token' and 'auth_token' for compatibility
      return localStorage.getItem('token') || localStorage.getItem('auth_token') || null
    }
  } catch (e) {
    // ignore
  }
  return null
}

// Create Axios instances with auth interceptors
const createApiClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  })

  // Attach auth header if available
  client.interceptors.request.use((config) => {
    const token = getAuthToken()
    if (token) {
      config.headers = config.headers || {}
      // Bearer token pattern
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Global response error handling
  client.interceptors.response.use(
    (r) => r,
    (error) => {
      // Only log non-CORS errors to reduce noise
      // CORS errors are expected when backend services are not running
      const isCorsError = 
        error.code === 'ERR_NETWORK' || 
        error.message?.includes('CORS') ||
        error.message?.includes('Network Error') ||
        (!error.response && error.request)
      
      if (!isCorsError) {
        console.error('[API ERROR]', error?.response || error.message || error)
      }
      
      // Handle 401 unauthorized - redirect to login
      if (error?.response?.status === 401) {
        // Clear auth data
        localStorage.removeItem('token')
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        // Redirect to login if not already there
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
      
      return Promise.reject(error)
    }
  )

  return client
}

// Instances
export const orchestratorApi = createApiClient(ORCHESTRATOR_URL)
// Attach x-api-key required by orchestrator for protected routes
orchestratorApi.defaults.headers.common['x-api-key'] = ORCHESTRATOR_API_KEY
export const forecastApi = createApiClient(FORECAST_AGENT_URL)
export const staffApi = createApiClient(STAFF_AGENT_URL)
export const erOrApi = createApiClient(ER_OR_AGENT_URL)
export const dischargeApi = createApiClient(DISCHARGE_AGENT_URL)
export const triageApi = createApiClient(TRIAGE_AGENT_URL)
export const flApi1 = createApiClient(FL_SERVER_1_URL)
export const flApi2 = createApiClient(FL_SERVER_2_URL)

// Backend API client (for auth and dashboard routes)
export const backendApi = createApiClient(API_URL)

export { MLFLOW_URL }

