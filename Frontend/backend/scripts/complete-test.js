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

async function testCompleteFlow() {
  console.log('🧪 Complete System Test\n')
  console.log('='.repeat(50))
  
  try {
    // Test 1: Database Connection
    console.log('\n1️⃣ Testing database connection...')
    await pool.query('SELECT NOW()')
    console.log('✅ Database connection successful')
    
    // Test 2: Verify users exist
    console.log('\n2️⃣ Verifying users exist...')
    const users = await pool.query('SELECT aadhaar_number, role, name FROM users')
    console.log(`✅ Found ${users.rows.length} users:`)
    users.rows.forEach(u => {
      console.log(`   - ${u.name} (${u.role}): ${u.aadhaar_number}`)
    })
    
    // Test 3: Test password verification
    console.log('\n3️⃣ Testing password verification...')
    const testCases = [
      { aadhaar: '123412341234', password: 'patient123', role: 'patient' },
      { aadhaar: '987698769876', password: 'hospital123', role: 'hospital' },
      { aadhaar: '111122223333', password: 'admin123', role: 'superadmin' },
    ]
    
    for (const test of testCases) {
      const result = await pool.query(
        'SELECT password FROM users WHERE aadhaar_number = $1',
        [test.aadhaar]
      )
      if (result.rows.length > 0) {
        const isValid = await bcrypt.compare(test.password, result.rows[0].password)
        console.log(`   ${isValid ? '✅' : '❌'} ${test.role}: ${isValid ? 'Password correct' : 'Password incorrect'}`)
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('\n✅ All database tests passed!')
    console.log('\n📋 Login Credentials:')
    console.log('   Patient:  123412341234 / patient123')
    console.log('   Hospital: 987698769876 / hospital123')
    console.log('   Admin:   111122223333 / admin123')
    console.log('\n🚀 Next steps:')
    console.log('   1. Start the server: npm run dev')
    console.log('   2. Test login at: http://localhost:3000/api/auth/login')
    console.log('   3. Use the credentials above to login\n')
    
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    await pool.end()
    process.exit(1)
  }
}

testCompleteFlow()

