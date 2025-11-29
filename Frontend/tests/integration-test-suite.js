import axios from 'axios'
import { expect } from 'chai'

const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000'
}

const testCredentials = {
  patient: { aadhaar_number: '123412341234', password: 'patient123' },
  hospital: { aadhaar_number: '987698769876', password: 'hospital123' },
  superadmin: { aadhaar_number: '111122223333', password: 'admin123' }
}

async function login(role) {
  try {
    const response = await axios.post(`${config.backendUrl}/api/auth/login`, testCredentials[role])
    return response.data.token
  } catch (error) {
    throw new Error(`Login failed for ${role}: ${error.message}`)
  }
}

async function makeAPICall(endpoint, method = 'GET', data = null, token = null) {
  try {
    const headers = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    const response = await axios({
      method,
      url: `${config.backendUrl}${endpoint}`,
      headers,
      data
    })
    return { success: true, data: response.data, status: response.status }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 500,
      data: error.response?.data
    }
  }
}

export async function runIntegrationTestSuite() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  }
  
  console.log('\n🧪 Running Integration Test Suite...\n')
  
  // Test 1: Complete Patient Journey
  try {
    // Login
    const token = await login('patient')
    expect(token).to.be.a('string')
    
    // Get dashboard
    const dashboard = await makeAPICall('/api/dashboard/patient', 'GET', null, token)
    expect(dashboard.success).to.be.true
    expect(dashboard.data).to.be.an('object')
    
    results.passed.push('Integration: Complete Patient Journey')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Complete Patient Journey', error: error.message })
    results.total++
  }
  
  // Test 2: Complete Hospital Journey
  try {
    // Login
    const token = await login('hospital')
    expect(token).to.be.a('string')
    
    // Get dashboard
    const dashboard = await makeAPICall('/api/dashboard/hospital', 'GET', null, token)
    expect(dashboard.success).to.be.true
    
    // Get forecast
    const forecast = await makeAPICall('/api/forecast/predict?days=7', 'GET', null, token)
    expect(forecast.success).to.be.true
    expect(forecast.data).to.be.an('array')
    
    // Get triage queue
    const queue = await makeAPICall('/api/triage/queue', 'GET', null, token)
    expect(queue.success).to.be.true
    
    results.passed.push('Integration: Complete Hospital Journey')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Complete Hospital Journey', error: error.message })
    results.total++
  }
  
  // Test 3: Triage Workflow
  try {
    const token = await login('hospital')
    
    // Submit triage assessment
    const triage = await makeAPICall('/api/triage', 'POST', {
      symptoms: ['chest pain', 'shortness of breath'],
      vitals: {
        temperature: 38.5,
        heart_rate: 120,
        oxygen_saturation: 92
      }
    }, token)
    expect(triage.success).to.be.true
    expect(triage.data.acuity_level).to.be.a('number')
    
    // Get queue (should include the assessment)
    const queue = await makeAPICall('/api/triage/queue', 'GET', null, token)
    expect(queue.success).to.be.true
    
    results.passed.push('Integration: Triage Workflow')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Triage Workflow', error: error.message })
    results.total++
  }
  
  // Test 4: ER/OR Scheduling Workflow
  try {
    const token = await login('hospital')
    
    // Add patient to ER
    const addPatient = await makeAPICall('/api/eror/patient', 'POST', {
      name: 'Integration Test Patient',
      age: 40,
      acuity_level: 4
    }, token)
    expect(addPatient.success).to.be.true
    expect(addPatient.data).to.have.property('id')
    
    // Get ER queue
    const queue = await makeAPICall('/api/eror/queue', 'GET', null, token)
    expect(queue.success).to.be.true
    
    // Schedule OR
    const schedule = await makeAPICall('/api/eror/schedule', 'POST', {
      surgeries: [
        { id: '1', duration: 120, priority: 5 },
        { id: '2', duration: 90, priority: 4 }
      ]
    }, token)
    expect(schedule.success).to.be.true
    expect(schedule.data).to.have.property('schedule')
    
    results.passed.push('Integration: ER/OR Scheduling Workflow')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: ER/OR Scheduling Workflow', error: error.message })
    results.total++
  }
  
  // Test 5: Forecast Workflow
  try {
    const token = await login('hospital')
    
    // Get forecast
    const forecast = await makeAPICall('/api/forecast/predict?days=7', 'GET', null, token)
    expect(forecast.success).to.be.true
    expect(forecast.data).to.be.an('array')
    expect(forecast.data.length).to.equal(7)
    
    // Run forecast workflow
    const runForecast = await makeAPICall('/forecast/run', 'POST', { horizon_days: 7 }, token)
    expect(runForecast.success).to.be.true
    expect(runForecast.data).to.have.property('forecast')
    
    // Get latest forecast
    const latest = await makeAPICall('/forecast/latest', 'GET', null, token)
    expect(latest.success).to.be.true
    expect(latest.data).to.have.property('forecast')
    
    results.passed.push('Integration: Forecast Workflow')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Forecast Workflow', error: error.message })
    results.total++
  }
  
  // Test 6: Staff Scheduling Workflow
  try {
    const token = await login('hospital')
    
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Generate schedule
    const generate = await makeAPICall('/api/scheduling/generate', 'POST', {
      start_date: startDate,
      end_date: endDate
    }, token)
    expect(generate.success).to.be.true
    expect(generate.data).to.be.an('array')
    
    // Get schedule
    const getSchedule = await makeAPICall(`/api/scheduling?start_date=${startDate}&end_date=${endDate}`, 'GET', null, token)
    expect(getSchedule.success).to.be.true
    expect(getSchedule.data).to.be.an('array')
    
    results.passed.push('Integration: Staff Scheduling Workflow')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Staff Scheduling Workflow', error: error.message })
    results.total++
  }
  
  // Test 7: Error Propagation - API Error to UI
  try {
    // Try to access protected endpoint without token
    const response = await makeAPICall('/api/dashboard/patient', 'GET')
    expect(response.success).to.be.false
    expect(response.status).to.equal(401)
    expect(response.data).to.have.property('error')
    
    results.passed.push('Integration: Error Propagation')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Error Propagation', error: error.message })
    results.total++
  }
  
  // Test 8: Authentication Flow - Token Storage and Usage
  try {
    // Login
    const loginResponse = await axios.post(`${config.backendUrl}/api/auth/login`, testCredentials.patient)
    const token = loginResponse.data.token
    expect(token).to.be.a('string')
    
    // Use token to access protected resource
    const meResponse = await makeAPICall('/api/auth/me', 'GET', null, token)
    expect(meResponse.success).to.be.true
    expect(meResponse.data).to.have.property('user')
    
    // Verify token works for multiple requests
    const dashboard1 = await makeAPICall('/api/dashboard/patient', 'GET', null, token)
    expect(dashboard1.success).to.be.true
    
    const dashboard2 = await makeAPICall('/api/dashboard/patient', 'GET', null, token)
    expect(dashboard2.success).to.be.true
    
    results.passed.push('Integration: Authentication Flow')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Authentication Flow', error: error.message })
    results.total++
  }
  
  // Test 9: Data Flow - Frontend to Backend to Database
  try {
    const token = await login('hospital')
    
    // Create data (add patient)
    const createResponse = await makeAPICall('/api/eror/patient', 'POST', {
      name: 'Data Flow Test',
      age: 25,
      acuity_level: 3
    }, token)
    expect(createResponse.success).to.be.true
    const patientId = createResponse.data.id
    
    // Read data (get queue)
    const readResponse = await makeAPICall('/api/eror/queue', 'GET', null, token)
    expect(readResponse.success).to.be.true
    expect(readResponse.data).to.be.an('array')
    const foundPatient = readResponse.data.find(p => p.id === patientId)
    expect(foundPatient).to.exist
    
    results.passed.push('Integration: Data Flow')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Data Flow', error: error.message })
    results.total++
  }
  
  // Test 10: Role-Based Access Control
  try {
    const patientToken = await login('patient')
    const hospitalToken = await login('hospital')
    
    // Patient should not access hospital endpoints
    const patientAccess = await makeAPICall('/api/forecast/predict?days=7', 'GET', null, patientToken)
    expect(patientAccess.success).to.be.false
    expect(patientAccess.status).to.equal(403)
    
    // Hospital should access hospital endpoints
    const hospitalAccess = await makeAPICall('/api/forecast/predict?days=7', 'GET', null, hospitalToken)
    expect(hospitalAccess.success).to.be.true
    
    results.passed.push('Integration: Role-Based Access Control')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'Integration: Role-Based Access Control', error: error.message })
    results.total++
  }
  
  console.log(`\n✅ Passed: ${results.passed.length}/${results.total}`)
  console.log(`❌ Failed: ${results.failed.length}/${results.total}\n`)
  
  return results
}


