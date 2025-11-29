import express from 'express'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'
import { body, validationResult } from 'express-validator'

const router = express.Router()

// Mock ER queue data
let mockERQueue = [
  {
    id: '1',
    name: 'John Doe',
    age: 45,
    acuity_level: 4,
    arrival_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'waiting',
  },
  {
    id: '2',
    name: 'Jane Smith',
    age: 32,
    acuity_level: 3,
    arrival_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'waiting',
  },
]

// Triage assessment
// POST /api/triage
router.post(
  '/',
  authenticateToken,
  authorizeRole('hospital', 'superadmin'),
  [
    body('symptoms').isArray().withMessage('Symptoms must be an array'),
    body('symptoms.*').isString().trim().notEmpty().withMessage('Each symptom must be a non-empty string'),
    body('vitals.temperature').optional().isFloat({ min: 30, max: 45 }).withMessage('Temperature must be between 30-45°C'),
    body('vitals.heart_rate').optional().isInt({ min: 30, max: 250 }).withMessage('Heart rate must be between 30-250 bpm'),
    body('vitals.oxygen_saturation').optional().isFloat({ min: 0, max: 100 }).withMessage('Oxygen saturation must be between 0-100%'),
    body('vitals.blood_pressure').optional().matches(/^\d{2,3}\/\d{2,3}$/).withMessage('Blood pressure must be in format: 120/80'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { symptoms, vitals } = req.body

      // Calculate acuity level based on symptoms and vitals
      let acuity = 3 // Default moderate

      // Critical vitals
      if (vitals?.heart_rate && vitals.heart_rate > 120) acuity = 5
      else if (vitals?.heart_rate && vitals.heart_rate > 100) acuity = 4

      if (vitals?.oxygen_saturation && vitals.oxygen_saturation < 90) acuity = 5
      else if (vitals?.oxygen_saturation && vitals.oxygen_saturation < 95) acuity = 4

      if (vitals?.temperature && vitals.temperature > 39) acuity = 4

      // Critical symptoms
      const criticalSymptoms = ['chest pain', 'difficulty breathing', 'severe', 'unconscious', 'bleeding']
      if (symptoms.some((s: string) => criticalSymptoms.some(cs => s.toLowerCase().includes(cs)))) {
        acuity = Math.max(acuity, 5)
      }

      const explanation = `Patient assessed with ${symptoms.length} symptom(s). Vitals indicate ${acuity >= 4 ? 'critical' : acuity === 3 ? 'moderate' : 'mild'} condition.`
      const recommended_action = acuity >= 4 ? 'Immediate treatment required' : acuity === 3 ? 'Priority treatment' : 'Standard care'

      res.json({
        acuity_level: acuity,
        explanation,
        recommended_action,
      })
    } catch (error) {
      console.error('Triage assessment error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Get ER queue
// GET /api/triage/queue
router.get('/queue', authenticateToken, authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
    res.json(mockERQueue)
  } catch (error) {
    console.error('Get ER queue error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get next patient
// GET /api/triage/next
router.get('/next', authenticateToken, authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
    // Sort by acuity (highest first) and arrival time (oldest first)
    const sorted = [...mockERQueue].sort((a, b) => {
      if (b.acuity_level !== a.acuity_level) {
        return b.acuity_level - a.acuity_level
      }
      return new Date(a.arrival_time).getTime() - new Date(b.arrival_time).getTime()
    })

    if (sorted.length === 0) {
      return res.status(404).json({ error: 'No patients in queue' })
    }

    res.json(sorted[0])
  } catch (error) {
    console.error('Get next patient error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add patient to ER queue
// POST /api/triage/patient
router.post(
  '/patient',
  authenticateToken,
  authorizeRole('hospital', 'superadmin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('age').isInt({ min: 0, max: 150 }).withMessage('Age must be between 0-150'),
    body('acuity_level').isInt({ min: 1, max: 5 }).withMessage('Acuity level must be between 1-5'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, age, acuity_level } = req.body

      const newPatient = {
        id: String(mockERQueue.length + 1),
        name,
        age,
        acuity_level,
        arrival_time: new Date().toISOString(),
        status: 'waiting',
      }

      mockERQueue.push(newPatient)

      res.json(newPatient)
    } catch (error) {
      console.error('Add patient error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router


