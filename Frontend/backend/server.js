import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import { validateEnv } from './config/env.js'
import { authenticateToken, authorizeRole } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import schedulingRoutes from './routes/scheduling.js'
import forecastRoutes from './routes/forecast.js'
import triageRoutes from './routes/triage.js'
import erorRoutes from './routes/eror.js'

dotenv.config()

// Validate environment variables before starting
try {
  validateEnv()
} catch (error) {
  console.error('❌ Environment validation failed:', error.message)
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3000

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
  : (process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8000', 'http://localhost:3000'])

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}))

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Input sanitization
app.use(mongoSanitize())

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
})

// Request logging middleware (sanitized)
const sanitizeLogData = (data) => {
  const sensitive = ['password', 'token', 'aadhaar_number', 'authorization', 'cookie']
  const sanitized = { ...data }
  sensitive.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '***REDACTED***'
    }
    // Also check nested objects
    Object.keys(sanitized).forEach(k => {
      if (typeof sanitized[k] === 'object' && sanitized[k] !== null) {
        sensitive.forEach(sKey => {
          if (sanitized[k][sKey]) {
            sanitized[k][sKey] = '***REDACTED***'
          }
        })
      }
    })
  })
  return sanitized
}

app.use((req, res, next) => {
  const sanitizedHeaders = sanitizeLogData(req.headers)
  const sanitizedBody = req.body ? sanitizeLogData(req.body) : {}
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    console.log(`  Headers:`, JSON.stringify(sanitizedHeaders, null, 2))
    if (Object.keys(sanitizedBody).length > 0) {
      console.log(`  Body:`, JSON.stringify(sanitizedBody, null, 2))
    }
  }
  next()
})

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Swasthya Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me'
      },
      dashboard: {
        patient: 'GET /api/dashboard/patient',
        hospital: 'GET /api/dashboard/hospital',
        admin: 'GET /api/dashboard/admin'
      }
    }
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Swasthya API is running' })
})

// Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/dashboard', apiLimiter, dashboardRoutes)
app.use('/api/scheduling', apiLimiter, schedulingRoutes)
app.use('/api/forecast', apiLimiter, forecastRoutes)
app.use('/api/triage', apiLimiter, triageRoutes)
app.use('/api/eror', apiLimiter, erorRoutes)
// Orchestrator endpoints (for compatibility with frontend)
// These are direct handlers that generate forecast data
app.post('/forecast/run', apiLimiter, authenticateToken, authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
    const horizon_days = req.body.horizon_days || 7
    
    if (horizon_days < 1 || horizon_days > 30) {
      return res.status(400).json({ error: 'horizon_days must be between 1 and 30' })
    }
    
    // Generate forecast data
    const forecast = []
    const today = new Date()
    for (let i = 0; i < horizon_days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const base = 50 + Math.random() * 30 + Math.sin(i * 0.5) * 10
      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(base),
        upper_bound: Math.round(base * 1.2),
        lower_bound: Math.round(base * 0.8),
      })
    }
    
    res.json({
      message: 'Forecast workflow completed successfully',
      forecast,
      horizon_days,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Forecast workflow error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/forecast/latest', apiLimiter, authenticateToken, authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
    const forecast = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const base = 50 + Math.random() * 30 + Math.sin(i * 0.5) * 10
      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(base),
        upper_bound: Math.round(base * 1.2),
        lower_bound: Math.round(base * 0.8),
      })
    }
    
    res.json({
      forecast,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get latest forecast error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  res.status(err.status || 500).json({ 
    error: isDevelopment ? err.message : 'Internal server error' 
  })
})

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`)
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.path,
    availableRoutes: [
      'GET /health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me'
    ]
  })
})

// Export app for testing, but only start server if not in test mode
if (process.env.NODE_ENV !== 'test' && !process.env.SKIP_SERVER_START) {
  app.listen(PORT, () => {
    console.log(`🚀 Swasthya Backend Server running on port ${PORT}`)
    console.log(`📋 Health check: http://localhost:${PORT}/health`)
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`)
  })
}

export default app

