import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = 'swasthya-super-secret-jwt-key-2024'

app.use(cors())
app.use(express.json())

// In-memory database (for testing without PostgreSQL)
const users = []
const hospitals = []
const patients = []

// Initialize default users
async function initMockData() {
  const patientPassword = await bcrypt.hash('patient123', 10)
  const hospitalPassword = await bcrypt.hash('hospital123', 10)
  const adminPassword = await bcrypt.hash('admin123', 10)

  users.push({
    user_id: 1,
    aadhaar_number: '123412341234',
    password: patientPassword,
    role: 'patient',
    name: 'John Patient',
  })

  users.push({
    user_id: 2,
    aadhaar_number: '987698769876',
    password: hospitalPassword,
    role: 'hospital',
    name: 'City General Hospital',
  })

  users.push({
    user_id: 3,
    aadhaar_number: '111122223333',
    password: adminPassword,
    role: 'superadmin',
    name: 'System Administrator',
  })

  patients.push({
    patient_id: 1,
    user_id: 1,
    date_of_birth: '1990-01-15',
    gender: 'Male',
    blood_group: 'O+',
  })

  hospitals.push({
    hospital_id: 1,
    user_id: 2,
    hospital_name: 'City General Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
  })

  console.log('✅ Mock data initialized')
  console.log('📋 Test Credentials:')
  console.log('Patient: 123412341234 / patient123')
  console.log('Hospital: 987698769876 / hospital123')
  console.log('Admin: 111122223333 / admin123')
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Swasthya API is running (Mock Mode)' })
})

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { aadhaar_number, password, role, name } = req.body

    if (!aadhaar_number || aadhaar_number.length !== 12 || !/^\d+$/.test(aadhaar_number)) {
      return res.status(400).json({ error: 'Aadhaar number must be exactly 12 digits' })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    if (!['patient', 'hospital', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    if (users.find((u) => u.aadhaar_number === aadhaar_number)) {
      return res.status(400).json({ error: 'Aadhaar number already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = {
      user_id: users.length + 1,
      aadhaar_number,
      password: hashedPassword,
      role,
      name,
    }

    users.push(newUser)

    if (role === 'patient') {
      patients.push({ patient_id: patients.length + 1, user_id: newUser.user_id })
    } else if (role === 'hospital') {
      hospitals.push({
        hospital_id: hospitals.length + 1,
        user_id: newUser.user_id,
        hospital_name: name,
      })
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: newUser.user_id,
        aadhaar_number: newUser.aadhaar_number,
        role: newUser.role,
        name: newUser.name,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { aadhaar_number, password } = req.body

    if (!aadhaar_number || aadhaar_number.length !== 12 || !/^\d+$/.test(aadhaar_number)) {
      return res.status(400).json({ error: 'Aadhaar number must be exactly 12 digits' })
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }

    const user = users.find((u) => u.aadhaar_number === aadhaar_number)

    if (!user) {
      return res.status(401).json({ error: 'Invalid Aadhaar number or password' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid Aadhaar number or password' })
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        aadhaar_number: user.aadhaar_number,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        aadhaar_number: user.aadhaar_number,
        role: user.role,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get current user
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = users.find((u) => u.user_id === decoded.user_id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({
      user: {
        user_id: user.user_id,
        aadhaar_number: user.aadhaar_number,
        role: user.role,
        name: user.name,
      },
    })
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' })
  }
})

// Patient Dashboard
app.get('/api/dashboard/patient', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied' })
    }

    const patient = patients.find((p) => p.user_id === decoded.user_id)
    const user = users.find((u) => u.user_id === decoded.user_id)

    res.json({
      patient: patient
        ? {
            ...patient,
            name: user.name,
            aadhaar_number: user.aadhaar_number,
          }
        : null,
      records: [],
    })
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' })
  }
})

// Hospital Dashboard
app.get('/api/dashboard/hospital', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'hospital') {
      return res.status(403).json({ error: 'Access denied' })
    }

    const hospital = hospitals.find((h) => h.user_id === decoded.user_id)
    const user = users.find((u) => u.user_id === decoded.user_id)

    res.json({
      hospital: hospital
        ? {
            ...hospital,
            name: user.name,
            aadhaar_number: user.aadhaar_number,
          }
        : null,
      patients: [],
      records: [],
    })
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' })
  }
})

// Admin Dashboard
app.get('/api/dashboard/admin', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json({
      hospitals: hospitals.map((h) => ({
        ...h,
        name: users.find((u) => u.user_id === h.user_id)?.name,
        aadhaar_number: users.find((u) => u.user_id === h.user_id)?.aadhaar_number,
        patient_count: 0,
      })),
      assignments: [],
      stats: {
        total_patients: patients.length,
        total_hospitals: hospitals.length,
        total_records: 0,
      },
    })
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' })
  }
})

// Initialize and start
initMockData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Swasthya Backend Server (Mock Mode) running on port ${PORT}`)
    console.log(`📋 Health check: http://localhost:${PORT}/health`)
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`)
    console.log(`\n⚠️  Running in MOCK MODE (no PostgreSQL required)`)
  })
})

