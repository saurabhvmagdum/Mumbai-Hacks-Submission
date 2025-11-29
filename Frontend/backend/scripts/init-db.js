import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'swasthya_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'swasthya2024',
})

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...')

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    await pool.query(schema)
    console.log('✅ Schema created successfully')

    // Create default users with hashed passwords
    const patientPassword = await bcrypt.hash('patient123', 10)
    const hospitalPassword = await bcrypt.hash('hospital123', 10)
    const adminPassword = await bcrypt.hash('admin123', 10)

    await pool.query(
      `INSERT INTO users (aadhaar_number, password, role, name) VALUES
       ($1, $2, 'patient', 'John Patient'),
       ($3, $4, 'hospital', 'City General Hospital'),
       ($5, $6, 'superadmin', 'System Administrator')
       ON CONFLICT (aadhaar_number) DO NOTHING`,
      [
        '123412341234',
        patientPassword,
        '987698769876',
        hospitalPassword,
        '111122223333',
        adminPassword,
      ]
    )
    console.log('✅ Default users created')

    // Get user IDs and create related records
    const patientUser = await pool.query(
      "SELECT user_id FROM users WHERE aadhaar_number = '123412341234'"
    )
    const hospitalUser = await pool.query(
      "SELECT user_id FROM users WHERE aadhaar_number = '987698769876'"
    )

    if (patientUser.rows[0]) {
      const existingPatient = await pool.query(
        'SELECT patient_id FROM patients WHERE user_id = $1',
        [patientUser.rows[0].user_id]
      )
      if (existingPatient.rows.length === 0) {
        await pool.query(
          `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, phone)
           VALUES ($1, '1990-01-15', 'Male', 'O+', '9876543210')`,
          [patientUser.rows[0].user_id]
        )
      }
    }

    if (hospitalUser.rows[0]) {
      const existingHospital = await pool.query(
        'SELECT hospital_id FROM hospitals WHERE user_id = $1',
        [hospitalUser.rows[0].user_id]
      )
      if (existingHospital.rows.length === 0) {
        await pool.query(
          `INSERT INTO hospitals (user_id, hospital_name, address, city, state, phone)
           VALUES ($1, 'City General Hospital', '123 Medical Street', 'Mumbai', 'Maharashtra', '02212345678')`,
          [hospitalUser.rows[0].user_id]
        )
      }
    }

    console.log('✅ Related records created')
    console.log('\n📋 Default Credentials:')
    console.log('Patient: 123412341234 / patient123')
    console.log('Hospital: 987698769876 / hospital123')
    console.log('Super Admin: 111122223333 / admin123')
    console.log('\n✅ Database initialization complete!')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    throw error
  } finally {
    await pool.end()
  }
}

initDatabase()

