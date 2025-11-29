/**
 * Environment Variable Validation
 * Ensures all required environment variables are set before application starts
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
]

const optionalEnvVars = {
  PORT: '3000',
  DB_PORT: '5432',
  JWT_EXPIRES_IN: '1h',
  NODE_ENV: 'development',
  ALLOWED_ORIGINS: 'http://localhost:8000,http://localhost:3000'
}

export function validateEnv() {
  const missing = []
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  })
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these in your .env file. See .env.example for reference.`
    )
  }
  
  // Set defaults for optional variables
  Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue
    }
  })
  
  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters long in production'
      )
    }
  }
  
  console.log('✅ Environment variables validated')
}

