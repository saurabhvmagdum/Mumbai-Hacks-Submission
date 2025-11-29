import request from 'supertest'
import { expect } from 'chai'

// Set test environment
process.env.NODE_ENV = 'test'
process.env.SKIP_SERVER_START = 'true'

// Import server app
let app
try {
  const serverModule = await import('../server.js')
  app = serverModule.default || serverModule
  if (!app) {
    throw new Error('App not exported from server.js')
  }
} catch (error) {
  console.error('Failed to import server:', error)
  // Create a minimal app for testing
  const express = (await import('express')).default
  app = express()
  app.use(express.json())
  app.get('/health', (req, res) => res.json({ status: 'ok' }))
}

let authTokens = {
  patient: null,
  hospital: null,
  superadmin: null
}

const testCredentials = {
  patient: { aadhaar_number: '123412341234', password: 'patient123' },
  hospital: { aadhaar_number: '987698769876', password: 'hospital123' },
  superadmin: { aadhaar_number: '111122223333', password: 'admin123' }
}

async function getAuthToken(role) {
  if (authTokens[role]) {
    return authTokens[role]
  }
  
  const creds = testCredentials[role]
  const response = await request(app)
    .post('/api/auth/login')
    .send(creds)
  
  if (response.status === 200 && response.body.token) {
    authTokens[role] = response.body.token
    return authTokens[role]
  }
  
  return null
}

export async function runAPITestSuite() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  }
  
  console.log('\n🧪 Running API Test Suite...\n')
  
  // Test 1: Health Check
  try {
    const response = await request(app).get('/health')
    expect(response.status).to.equal(200)
    expect(response.body.status).to.equal('ok')
    results.passed.push('Health check')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Health check', error: error.message })
    results.total++
  }
  
  // Test 2: Authentication - Login (Patient)
  try {
    const response = await request(app)
      .post('/api/auth/login')
      .send(testCredentials.patient)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('token')
    expect(response.body).to.have.property('user')
    authTokens.patient = response.body.token
    results.passed.push('Auth: Login (Patient)')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Auth: Login (Patient)', error: error.message })
    results.total++
  }
  
  // Test 3: Authentication - Login (Hospital)
  try {
    const response = await request(app)
      .post('/api/auth/login')
      .send(testCredentials.hospital)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('token')
    authTokens.hospital = response.body.token
    results.passed.push('Auth: Login (Hospital)')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Auth: Login (Hospital)', error: error.message })
    results.total++
  }
  
  // Test 4: Authentication - Login (Superadmin)
  try {
    const response = await request(app)
      .post('/api/auth/login')
      .send(testCredentials.superadmin)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('token')
    authTokens.superadmin = response.body.token
    results.passed.push('Auth: Login (Superadmin)')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Auth: Login (Superadmin)', error: error.message })
    results.total++
  }
  
  // Test 5: Authentication - Get Me (Patient)
  try {
    const token = await getAuthToken('patient')
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('user')
    results.passed.push('Auth: Get Me (Patient)')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Auth: Get Me (Patient)', error: error.message })
    results.total++
  }
  
  // Test 6: Dashboard - Patient Dashboard
  try {
    const token = await getAuthToken('patient')
    const response = await request(app)
      .get('/api/dashboard/patient')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('object')
    results.passed.push('Dashboard: Patient')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Dashboard: Patient', error: error.message })
    results.total++
  }
  
  // Test 7: Dashboard - Hospital Dashboard
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .get('/api/dashboard/hospital')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('object')
    results.passed.push('Dashboard: Hospital')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Dashboard: Hospital', error: error.message })
    results.total++
  }
  
  // Test 8: Dashboard - Admin Dashboard
  try {
    const token = await getAuthToken('superadmin')
    const response = await request(app)
      .get('/api/dashboard/admin')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('object')
    results.passed.push('Dashboard: Admin')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Dashboard: Admin', error: error.message })
    results.total++
  }
  
  // Test 9: Forecast - Predict
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .get('/api/forecast/predict?days=7')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('array')
    expect(response.body.length).to.be.greaterThan(0)
    expect(response.body[0]).to.have.property('date')
    expect(response.body[0]).to.have.property('predicted')
    results.passed.push('Forecast: Predict')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Forecast: Predict', error: error.message })
    results.total++
  }
  
  // Test 10: Forecast - Run
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .post('/forecast/run')
      .set('Authorization', `Bearer ${token}`)
      .send({ horizon_days: 7 })
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('forecast')
    results.passed.push('Forecast: Run')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Forecast: Run', error: error.message })
    results.total++
  }
  
  // Test 11: Forecast - Latest
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .get('/forecast/latest')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('forecast')
    results.passed.push('Forecast: Latest')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Forecast: Latest', error: error.message })
    results.total++
  }
  
  // Test 12: Triage - Submit Assessment
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .post('/api/triage')
      .set('Authorization', `Bearer ${token}`)
      .send({
        symptoms: ['fever', 'cough'],
        vitals: {
          temperature: 38.5,
          heart_rate: 85,
          oxygen_saturation: 98
        }
      })
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('acuity_level')
    expect(response.body).to.have.property('recommended_action')
    results.passed.push('Triage: Submit Assessment')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Triage: Submit Assessment', error: error.message })
    results.total++
  }
  
  // Test 13: Triage - Get Queue
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .get('/api/triage/queue')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('array')
    results.passed.push('Triage: Get Queue')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Triage: Get Queue', error: error.message })
    results.total++
  }
  
  // Test 14: Triage - Get Next Patient
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .get('/api/triage/next')
      .set('Authorization', `Bearer ${token}`)
    
    expect([200, 404]).to.include(response.status)
    if (response.status === 200) {
      expect(response.body).to.have.property('id')
    }
    results.passed.push('Triage: Get Next Patient')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Triage: Get Next Patient', error: error.message })
    results.total++
  }
  
  // Test 15: ER/OR - Add Patient
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .post('/api/eror/patient')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Patient',
        age: 30,
        acuity_level: 3
      })
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('id')
    results.passed.push('ER/OR: Add Patient')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'ER/OR: Add Patient', error: error.message })
    results.total++
  }
  
  // Test 16: ER/OR - Get Queue
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .get('/api/eror/queue')
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('array')
    results.passed.push('ER/OR: Get Queue')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'ER/OR: Get Queue', error: error.message })
    results.total++
  }
  
  // Test 17: ER/OR - Schedule OR
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .post('/api/eror/schedule')
      .set('Authorization', `Bearer ${token}`)
      .send({
        surgeries: [
          { id: '1', duration: 120, priority: 5 }
        ]
      })
    
    expect(response.status).to.equal(200)
    expect(response.body).to.have.property('schedule')
    results.passed.push('ER/OR: Schedule OR')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'ER/OR: Schedule OR', error: error.message })
    results.total++
  }
  
  // Test 18: Scheduling - Generate Schedule
  try {
    const token = await getAuthToken('hospital')
    const response = await request(app)
      .post('/api/scheduling/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
    
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('array')
    results.passed.push('Scheduling: Generate Schedule')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Scheduling: Generate Schedule', error: error.message })
    results.total++
  }
  
  // Test 19: Scheduling - Get Schedule
  try {
    const token = await getAuthToken('hospital')
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const response = await request(app)
      .get(`/api/scheduling?start_date=${startDate}&end_date=${endDate}`)
      .set('Authorization', `Bearer ${token}`)
    
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('array')
    results.passed.push('Scheduling: Get Schedule')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Scheduling: Get Schedule', error: error.message })
    results.total++
  }
  
  // Test 20: Authentication - Invalid Credentials
  try {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ aadhaar_number: '999999999999', password: 'wrong' })
    
    expect(response.status).to.equal(401)
    results.passed.push('Auth: Invalid Credentials (Error Handling)')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Auth: Invalid Credentials', error: error.message })
    results.total++
  }
  
  // Test 21: Unauthorized Access
  try {
    const response = await request(app)
      .get('/api/dashboard/patient')
    
    expect(response.status).to.equal(401)
    results.passed.push('Auth: Unauthorized Access (Error Handling)')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Auth: Unauthorized Access', error: error.message })
    results.total++
  }
  
  console.log(`\n✅ Passed: ${results.passed.length}/${results.total}`)
  console.log(`❌ Failed: ${results.failed.length}/${results.total}\n`)
  
  return results
}

