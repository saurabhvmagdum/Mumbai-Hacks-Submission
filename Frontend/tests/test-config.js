import dotenv from 'dotenv'

dotenv.config()

export const config = {
  // Test execution settings
  maxIterations: parseInt(process.env.MAX_ITERATIONS || '10'),
  testTimeout: parseInt(process.env.TEST_TIMEOUT || '30000'), // 30 seconds per suite
  
  // Server URLs
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000',
  
  // Test credentials
  testCredentials: {
    patient: {
      aadhaar_number: '123412341234',
      password: 'patient123',
      role: 'patient'
    },
    hospital: {
      aadhaar_number: '987698769876',
      password: 'hospital123',
      role: 'hospital'
    },
    superadmin: {
      aadhaar_number: '111122223333',
      password: 'admin123',
      role: 'superadmin'
    }
  },
  
  // Test suites to run
  suites: {
    api: true,
    ui: true,
    integration: true
  },
  
  // Auto-fix settings
  autoFix: {
    enabled: true,
    fixMissingRoutes: true,
    fixMissingMiddleware: true,
    fixMissingValidation: true,
    fixResponseFormats: true,
    fixErrorHandling: true,
    fixCORS: true,
    fixTypes: true
  },
  
  // Report settings
  report: {
    outputDir: './test-reports',
    format: 'json', // json, html, text
    includeDetails: true
  },
  
  // Logging
  logging: {
    level: 'info', // debug, info, warn, error
    outputFile: './test-reports/test.log'
  }
}

// Override with command line arguments
export function updateConfigFromArgs(args) {
  if (args.includes('--max-iterations')) {
    const idx = args.indexOf('--max-iterations')
    if (args[idx + 1]) {
      config.maxIterations = parseInt(args[idx + 1])
    }
  }
  
  if (args.includes('--suite')) {
    const idx = args.indexOf('--suite')
    const suite = args[idx + 1]
    if (suite) {
      config.suites = {
        api: suite === 'api',
        ui: suite === 'ui',
        integration: suite === 'integration'
      }
    }
  }
  
  if (args.includes('--no-fix')) {
    config.autoFix.enabled = false
  }
}


