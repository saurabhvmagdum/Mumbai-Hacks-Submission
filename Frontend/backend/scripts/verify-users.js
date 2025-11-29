import 'dotenv/config'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'swasthya_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'swasthya2024',
})

async function verifyUsers() {
  try {
    console.log('🔍 Verifying users in database...\n')
    
    const result = await pool.query('SELECT user_id, aadhaar_number, role, name, password FROM users')
    
    console.log(`Found ${result.rows.length} users:\n`)
    
    for (const user of result.rows) {
      console.log(`User ID: ${user.user_id}`)
      console.log(`Aadhaar: ${user.aadhaar_number}`)
      console.log(`Role: ${user.role}`)
      console.log(`Name: ${user.name}`)
      console.log(`Password hash: ${user.password.substring(0, 20)}...`)
      
      // Test password verification
      const testPasswords = {
        '123412341234': 'patient123',
        '987698769876': 'hospital123',
        '111122223333': 'admin123',
      }
      
      const testPassword = testPasswords[user.aadhaar_number]
      if (testPassword) {
        const isValid = await bcrypt.compare(testPassword, user.password)
        console.log(`Password '${testPassword}' verification: ${isValid ? '✅' : '❌'}`)
      }
      console.log('')
    }
    
    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error)
    await pool.end()
    process.exit(1)
  }
}

verifyUsers()

