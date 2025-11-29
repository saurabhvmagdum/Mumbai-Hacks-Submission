import express from 'express'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'
import { body, validationResult } from 'express-validator'

const router = express.Router()

// Mock ER queue (shared with triage)
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

// Mock OR schedule
let mockORSchedule = []

// Add patient to ER
// POST /api/eror/patient
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
        acuity_level: acuity_level || 3,
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

// Get ER queue
// GET /api/eror/queue
router.get('/queue', authenticateToken, authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
    res.json(mockERQueue)
  } catch (error) {
    console.error('Get ER queue error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get next patient
// GET /api/eror/next
router.get('/next', authenticateToken, authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
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

// Schedule OR
// POST /api/eror/schedule
router.post(
  '/schedule',
  authenticateToken,
  authorizeRole('hospital', 'superadmin'),
  [
    body('surgeries').optional().isArray(),
    body('cases').optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { surgeries, cases } = req.body

      // Generate mock OR schedule
      const schedule = []
      const today = new Date()
      today.setHours(8, 0, 0, 0)

      const items = surgeries || cases || []
      items.forEach((item: any, index: number) => {
        const startTime = new Date(today)
        startTime.setHours(8 + index * 2, 0, 0, 0)

        const duration = item.duration || item.estimated_duration || 120 // Default 2 hours
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + duration)

        schedule.push({
          id: item.id || item.case_id || String(index + 1),
          procedure_type: item.procedure_type || 'General Surgery',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration,
          priority: item.priority || 3,
          room: `OR-${(index % 3) + 1}`,
        })
      })

      mockORSchedule = schedule

      res.json({
        message: 'OR schedule generated successfully',
        schedule,
      })
    } catch (error) {
      console.error('Schedule OR error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Get OR schedule
// GET /api/eror/schedule
router.get('/schedule', authenticateToken, authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
    res.json(mockORSchedule)
  } catch (error) {
    console.error('Get OR schedule error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


