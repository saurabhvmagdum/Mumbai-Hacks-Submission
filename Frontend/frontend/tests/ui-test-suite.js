import axios from 'axios'
import { expect } from 'chai'

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

const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000'
}

async function getAuthToken(role) {
  if (authTokens[role]) {
    return authTokens[role]
  }
  
  try {
    const response = await axios.post(`${config.backendUrl}/api/auth/login`, testCredentials[role])
    if (response.data.token) {
      authTokens[role] = response.data.token
      return authTokens[role]
    }
  } catch (error) {
    console.error(`Failed to get auth token for ${role}:`, error.message)
  }
  
  return null
}

async function makeAPICall(endpoint, method = 'GET', data = null, token = null) {
  try {
    const headers = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    const config = {
      method,
      url: `${config.backendUrl}${endpoint}`,
      headers,
      data
    }
    
    const response = await axios(config)
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

export async function runUITestSuite() {
  const results = {
    passed: [],
    failed: [],
    total: 0
  }
  
  console.log('\n🧪 Running UI Test Suite...\n')
  
  // Test 1: Login Flow - Patient
  try {
    const response = await makeAPICall('/api/auth/login', 'POST', testCredentials.patient)
    expect(response.success).to.be.true
    expect(response.data).to.have.property('token')
    expect(response.data).to.have.property('user')
    authTokens.patient = response.data.token
    results.passed.push('UI: Login Flow (Patient)')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Login Flow (Patient)', error: error.message })
    results.total++
  }
  
  // Test 2: Login Flow - Hospital
  try {
    const response = await makeAPICall('/api/auth/login', 'POST', testCredentials.hospital)
    expect(response.success).to.be.true
    expect(response.data).to.have.property('token')
    authTokens.hospital = response.data.token
    results.passed.push('UI: Login Flow (Hospital)')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Login Flow (Hospital)', error: error.message })
    results.total++
  }
  
  // Test 3: Dashboard - Patient Dashboard Data
  try {
    const token = await getAuthToken('patient')
    const response = await makeAPICall('/api/dashboard/patient', 'GET', null, token)
    expect(response.success).to.be.true
    expect(response.data).to.be.an('object')
    results.passed.push('UI: Patient Dashboard Data')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Patient Dashboard Data', error: error.message })
    results.total++
  }
  
  // Test 4: Dashboard - Hospital Dashboard Data
  try {
    const token = await getAuthToken('hospital')
    const response = await makeAPICall('/api/dashboard/hospital', 'GET', null, token)
    expect(response.success).to.be.true
    expect(response.data).to.be.an('object')
    results.passed.push('UI: Hospital Dashboard Data')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Hospital Dashboard Data', error: error.message })
    results.total++
  }
  
  // Test 5: Dashboard - Admin Dashboard Data
  try {
    const token = await getAuthToken('superadmin')
    const response = await makeAPICall('/api/dashboard/admin', 'GET', null, token)
    expect(response.success).to.be.true
    expect(response.data).to.be.an('object')
    results.passed.push('UI: Admin Dashboard Data')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Admin Dashboard Data', error: error.message })
    results.total++
  }
  
  // Test 6: Demand Forecast - Get Forecast
  try {
    const token = await getAuthToken('hospital')
    const response = await makeAPICall('/api/forecast/predict?days=7', 'GET', null, token)
    expect(response.success).to.be.true
    expect(response.data).to.be.an('array')
    expect(response.data.length).to.be.greaterThan(0)
    results.passed.push('UI: Demand Forecast - Get Forecast')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Demand Forecast - Get Forecast', error: error.message })
    results.total++
  }
  
  // Test 7: Demand Forecast - Run Forecast
  try {
    const token = await getAuthToken('hospital')
    const response = await makeAPICall('/forecast/run', 'POST', { horizon_days: 7 }, token)
    expect(response.success).to.be.true
    expect(response.data).to.have.property('forecast')
    results.passed.push('UI: Demand Forecast - Run Forecast')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Demand Forecast - Run Forecast', error: error.message })
    results.total++
  }
  
  // Test 8: Triage - Submit Assessment
  try {
    const token = await getAuthToken('hospital')
    const response = await makeAPICall('/api/triage', 'POST', {
      symptoms: ['fever', 'cough'],
      vitals: {
        temperature: 38.5,
        heart_rate: 85,
        oxygen_saturation: 98
      }
    }, token)
    expect(response.success).to.be.true
    expect(response.data).to.have.property('acuity_level')
    results.passed.push('UI: Triage - Submit Assessment')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Triage - Submit Assessment', error: error.message })
    results.total++
  }
  
  // Test 9: Triage - Get Queue
  try {
    const token = await getAuthToken('hospital')
    const response = await makeAPICall('/api/triage/queue', 'GET', null, token)
    expect(response.success).to.be.true
    expect(response.data).to.be.an('array')
    results.passed.push('UI: Triage - Get Queue')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Triage - Get Queue', error: error.message })
    results.total++
  }
  
  // Test 10: ER/OR - Add Patient
  try {
    const token = await getAuthToken('hospital')
    const response = await makeAPICall('/api/eror/patient', 'POST', {
      name: 'Test Patient UI',
      age: 35,
      acuity_level: 3
    }, token)
    expect(response.success).to.be.true
    expect(response.data).to.have.property('id')
    results.passed.push('UI: ER/OR - Add Patient')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: ER/OR - Add Patient', error: error.message })
    results.total++
  }
  
  // Test 11: ER/OR - Get Queue
  try {
    const token = await getAuthToken('hospital')
    const response = await makeAPICall('/api/eror/queue', 'GET', null, token)
    expect(response.success).to.be.true
    expect(response.data).to.be.an('array')
    results.passed.push('UI: ER/OR - Get Queue')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: ER/OR - Get Queue', error: error.message })
    results.total++
  }
  
  // Test 12: ER/OR - Schedule OR
  try {
    const token = await getAuthToken('hospital')
    const response = await makeAPICall('/api/eror/schedule', 'POST', {
      surgeries: [
        { id: '1', duration: 120, priority: 5 },
        { id: '2', duration: 90, priority: 4 }
      ]
    }, token)
    expect(response.success).to.be.true
    expect(response.data).to.have.property('schedule')
    results.passed.push('UI: ER/OR - Schedule OR')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: ER/OR - Schedule OR', error: error.message })
    results.total++
  }
  
  // Test 13: Staff Scheduling - Generate Schedule
  try {
    const token = await getAuthToken('hospital')
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const response = await makeAPICall('/api/scheduling/generate', 'POST', {
      start_date: startDate,
      end_date: endDate
    }, token)
    expect(response.success).to.be.true
    expect(response.data).to.be.an('array')
    results.passed.push('UI: Staff Scheduling - Generate Schedule')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Staff Scheduling - Generate Schedule', error: error.message })
    results.total++
  }
  
  // Test 14: Staff Scheduling - Get Schedule
  try {
    const token = await getAuthToken('hospital')
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const response = await makeAPICall(`/api/scheduling?start_date=${startDate}&end_date=${endDate}`, 'GET', null, token)
    expect(response.success).to.be.true
    expect(response.data).to.be.an('array')
    results.passed.push('UI: Staff Scheduling - Get Schedule')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Staff Scheduling - Get Schedule', error: error.message })
    results.total++
  }
  
  // Test 15: Error Handling - Invalid Login
  try {
    const response = await makeAPICall('/api/auth/login', 'POST', {
      aadhaar_number: '999999999999',
      password: 'wrongpassword'
    })
    expect(response.success).to.be.false
    expect(response.status).to.equal(401)
    results.passed.push('UI: Error Handling - Invalid Login')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Error Handling - Invalid Login', error: error.message })
    results.total++
  }
  
  // Test 16: Error Handling - Unauthorized Access
  try {
    const response = await makeAPICall('/api/dashboard/patient', 'GET')
    expect(response.success).to.be.false
    expect(response.status).to.equal(401)
    results.passed.push('UI: Error Handling - Unauthorized Access')
    results.total++
  } catch (error) {
    results.failed.push({ test: 'UI: Error Handling - Unauthorized Access', error: error.message })
    results.total++
  }
  
  console.log(`\n✅ Passed: ${results.passed.length}/${results.total}`)
  console.log(`❌ Failed: ${results.failed.length}/${results.total}\n`)
  
  return results
}


