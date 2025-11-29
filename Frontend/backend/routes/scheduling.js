import express from 'express'
import { pool } from '../config/db.js'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'
import { body, validationResult } from 'express-validator'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)
// Note: Some routes allow hospital role, some require superadmin

// Get all hospitals for assignment (superadmin only)
router.get('/hospitals', authorizeRole('superadmin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, u.name, u.aadhaar_number 
       FROM hospitals h 
       JOIN users u ON h.user_id = u.user_id 
       ORDER BY h.hospital_name`
    )
    res.json({ hospitals: result.rows })
  } catch (error) {
    console.error('Get hospitals error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Assign hospital (superadmin only)
router.post(
  '/assign',
  authorizeRole('superadmin'),
  [
    body('hospital_id').isInt().withMessage('Valid hospital ID required'),
    body('notes').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { hospital_id, notes } = req.body

      const result = await pool.query(
        `INSERT INTO hospital_assignments (hospital_id, assigned_by, notes) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [hospital_id, req.user.user_id, notes || null]
      )

      res.status(201).json({
        message: 'Hospital assigned successfully',
        assignment: result.rows[0],
      })
    } catch (error) {
      console.error('Assign hospital error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Get assignments (superadmin only)
router.get('/assignments', authorizeRole('superadmin'), async (req, res) => {
  try {
    const { status, hospital_id } = req.query

    let query = `SELECT ha.*, h.hospital_name, h.city, h.state, u.name as assigned_by_name 
                 FROM hospital_assignments ha 
                 JOIN hospitals h ON ha.hospital_id = h.hospital_id 
                 JOIN users u ON ha.assigned_by = u.user_id 
                 WHERE 1=1`
    const params = []
    let paramCount = 1

    if (status) {
      query += ` AND ha.status = $${paramCount}`
      params.push(status)
      paramCount++
    }

    if (hospital_id) {
      query += ` AND ha.hospital_id = $${paramCount}`
      params.push(hospital_id)
      paramCount++
    }

    query += ' ORDER BY ha.created_at DESC'

    const result = await pool.query(query, params)
    res.json({ assignments: result.rows })
  } catch (error) {
    console.error('Get assignments error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// View hospital details (superadmin only)
router.get('/hospital/:id', authorizeRole('superadmin'), async (req, res) => {
  try {
    const hospitalId = req.params.id

    const hospital = await pool.query(
      `SELECT h.*, u.name, u.aadhaar_number 
       FROM hospitals h 
       JOIN users u ON h.user_id = u.user_id 
       WHERE h.hospital_id = $1`,
      [hospitalId]
    )

    if (hospital.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' })
    }

    const patients = await pool.query(
      `SELECT DISTINCT p.*, u.name as patient_name, u.aadhaar_number 
       FROM patients p 
       JOIN users u ON p.user_id = u.user_id 
       JOIN patient_records pr ON p.patient_id = pr.patient_id 
       WHERE pr.hospital_id = $1`,
      [hospitalId]
    )

    const records = await pool.query(
      `SELECT pr.*, u.name as patient_name 
       FROM patient_records pr 
       JOIN patients p ON pr.patient_id = p.patient_id 
       JOIN users u ON p.user_id = u.user_id 
       WHERE pr.hospital_id = $1 
       ORDER BY pr.record_date DESC`,
      [hospitalId]
    )

    res.json({
      hospital: hospital.rows[0],
      patients: patients.rows,
      records: records.rows,
    })
  } catch (error) {
    console.error('Get hospital details error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update assignment status (superadmin only)
router.patch('/assignment/:id', authorizeRole('superadmin'), async (req, res) => {
  try {
    const { status, notes } = req.body
    const assignmentId = req.params.id

    const result = await pool.query(
      `UPDATE hospital_assignments 
       SET status = $1, notes = COALESCE($2, notes) 
       WHERE assignment_id = $3 
       RETURNING *`,
      [status, notes, assignmentId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    res.json({
      message: 'Assignment updated successfully',
      assignment: result.rows[0],
    })
  } catch (error) {
    console.error('Update assignment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Generate staff schedule (for hospital role)
router.post(
  '/generate',
  authorizeRole('hospital', 'superadmin'),
  [
    body('start_date').isISO8601().withMessage('Valid start date required'),
    body('end_date').isISO8601().withMessage('Valid end date required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { start_date, end_date } = req.body

      // Generate mock schedule
      const schedule = []
      const start = new Date(start_date)
      const end = new Date(end_date)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      for (let i = 0; i < Math.min(daysDiff, 7); i++) {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        schedule.push({
          staff_id: '1',
          shifts: [{
            date: date.toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '16:00',
          }],
        })
      }

      res.json(schedule)
    } catch (error) {
      console.error('Generate schedule error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Get schedule (for hospital role)
router.get(
  '/',
  authorizeRole('hospital', 'superadmin'),
  async (req, res) => {
    try {
      const { start_date, end_date } = req.query

      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required' })
      }

      // Generate mock schedule
      const schedule = []
      const start = new Date(start_date as string)
      const end = new Date(end_date as string)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      for (let i = 0; i < Math.min(daysDiff, 7); i++) {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        schedule.push({
          staff_id: '1',
          shifts: [{
            date: date.toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '16:00',
          }],
        })
      }

      res.json(schedule)
    } catch (error) {
      console.error('Get schedule error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Run scheduling workflow
router.post('/run', authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
    res.json({ message: 'Scheduling workflow completed successfully' })
  } catch (error) {
    console.error('Run scheduling error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get scheduler status
router.get('/status', authorizeRole('hospital', 'superadmin'), async (req, res) => {
  try {
    res.json({ status: 'active', last_run: new Date().toISOString() })
  } catch (error) {
    console.error('Get scheduler status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

