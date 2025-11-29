import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { pool } from '../config/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Validation: Aadhaar must be exactly 12 digits
const aadhaarValidator = body('aadhaar_number')
  .isLength({ min: 12, max: 12 })
  .matches(/^\d+$/)
  .withMessage('Aadhaar number must be exactly 12 digits')

// Register
router.post(
  '/register',
  [
    aadhaarValidator,
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    // Only allow patient and hospital roles in registration
    // Superadmin must be created manually by system administrator
    body('role').isIn(['patient', 'hospital']).withMessage('Invalid role. Only patient and hospital roles can be registered.'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { aadhaar_number, password, role, name } = req.body

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT * FROM users WHERE aadhaar_number = $1',
        [aadhaar_number]
      )

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Aadhaar number already registered' })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const result = await pool.query(
        'INSERT INTO users (aadhaar_number, password, role, name) VALUES ($1, $2, $3, $4) RETURNING user_id, aadhaar_number, role, name',
        [aadhaar_number, hashedPassword, role, name]
      )

      const user = result.rows[0]

      // Create related records based on role
      if (role === 'hospital') {
        await pool.query(
          'INSERT INTO hospitals (user_id, hospital_name) VALUES ($1, $2)',
          [user.user_id, name]
        )
      } else if (role === 'patient') {
        await pool.query(
          'INSERT INTO patients (user_id) VALUES ($1)',
          [user.user_id]
        )
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          user_id: user.user_id,
          aadhaar_number: user.aadhaar_number,
          role: user.role,
          name: user.name,
        },
      })
    } catch (error) {
      console.error('Registration error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Login
router.post(
  '/login',
  [aadhaarValidator, body('password').notEmpty().withMessage('Password is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { aadhaar_number, password } = req.body

      // Find user
      const result = await pool.query('SELECT * FROM users WHERE aadhaar_number = $1', [
        aadhaar_number,
      ])

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid Aadhaar number or password' })
      }

      const user = result.rows[0]

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid Aadhaar number or password' })
      }

      // Generate JWT token
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: 'Server configuration error' })
      }

      const token = jwt.sign(
        {
          user_id: user.user_id,
          aadhaar_number: user.aadhaar_number,
          role: user.role,
          name: user.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
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
  }
)

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, aadhaar_number, role, name FROM users WHERE user_id = $1', [
      req.user.user_id,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

