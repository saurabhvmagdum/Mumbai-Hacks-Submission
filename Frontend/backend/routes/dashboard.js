import express from 'express'
import { pool } from '../config/db.js'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'

const router = express.Router()

// Patient Dashboard
router.get('/patient', authenticateToken, authorizeRole('patient'), async (req, res) => {
  try {
    const patient = await pool.query(
      `SELECT p.*, u.name, u.aadhaar_number 
       FROM patients p 
       JOIN users u ON p.user_id = u.user_id 
       WHERE p.user_id = $1`,
      [req.user.user_id]
    )

    const records = await pool.query(
      `SELECT pr.*, h.hospital_name 
       FROM patient_records pr 
       JOIN hospitals h ON pr.hospital_id = h.hospital_id 
       WHERE pr.patient_id = (SELECT patient_id FROM patients WHERE user_id = $1)
       ORDER BY pr.record_date DESC 
       LIMIT 10`,
      [req.user.user_id]
    )

    res.json({
      patient: patient.rows[0] || null,
      records: records.rows,
    })
  } catch (error) {
    console.error('Patient dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Hospital Dashboard
router.get('/hospital', authenticateToken, authorizeRole('hospital'), async (req, res) => {
  try {
    const hospital = await pool.query(
      `SELECT h.*, u.name, u.aadhaar_number 
       FROM hospitals h 
       JOIN users u ON h.user_id = u.user_id 
       WHERE h.user_id = $1`,
      [req.user.user_id]
    )

    const patients = await pool.query(
      `SELECT DISTINCT p.*, u.name as patient_name, u.aadhaar_number 
       FROM patients p 
       JOIN users u ON p.user_id = u.user_id 
       JOIN patient_records pr ON p.patient_id = pr.patient_id 
       WHERE pr.hospital_id = (SELECT hospital_id FROM hospitals WHERE user_id = $1)
       LIMIT 50`,
      [req.user.user_id]
    )

    const records = await pool.query(
      `SELECT pr.*, p.patient_id, u.name as patient_name 
       FROM patient_records pr 
       JOIN patients p ON pr.patient_id = p.patient_id 
       JOIN users u ON p.user_id = u.user_id 
       WHERE pr.hospital_id = (SELECT hospital_id FROM hospitals WHERE user_id = $1)
       ORDER BY pr.record_date DESC 
       LIMIT 20`,
      [req.user.user_id]
    )

    res.json({
      hospital: hospital.rows[0] || null,
      patients: patients.rows,
      records: records.rows,
    })
  } catch (error) {
    console.error('Hospital dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Super Admin Dashboard
router.get('/admin', authenticateToken, authorizeRole('superadmin'), async (req, res) => {
  try {
    const hospitals = await pool.query(
      `SELECT h.*, u.name, u.aadhaar_number, 
       (SELECT COUNT(*) FROM patient_records WHERE hospital_id = h.hospital_id) as patient_count
       FROM hospitals h 
       JOIN users u ON h.user_id = u.user_id 
       ORDER BY h.created_at DESC`
    )

    const assignments = await pool.query(
      `SELECT ha.*, h.hospital_name, u.name as assigned_by_name 
       FROM hospital_assignments ha 
       JOIN hospitals h ON ha.hospital_id = h.hospital_id 
       JOIN users u ON ha.assigned_by = u.user_id 
       ORDER BY ha.created_at DESC 
       LIMIT 20`
    )

    const stats = await pool.query(
      `SELECT 
       (SELECT COUNT(*) FROM users WHERE role = 'patient') as total_patients,
       (SELECT COUNT(*) FROM users WHERE role = 'hospital') as total_hospitals,
       (SELECT COUNT(*) FROM patient_records) as total_records`
    )

    res.json({
      hospitals: hospitals.rows,
      assignments: assignments.rows,
      stats: stats.rows[0],
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

