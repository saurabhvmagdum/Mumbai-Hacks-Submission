import 'dotenv/config'

const API_URL = `http://localhost:${process.env.PORT || 3000}`

async function testLogin() {
  console.log('🧪 Complete Login Test\n')
  console.log('='.repeat(50))
  
  const testUsers = [
    { aadhaar_number: '123412341234', password: 'patient123', role: 'patient' },
    { aadhaar_number: '987698769876', password: 'hospital123', role: 'hospital' },
    { aadhaar_number: '111122223333', password: 'admin123', role: 'superadmin' },
  ]

  // Test 1: Health check
  console.log('\n1️⃣ Testing server health...')
  try {
    const healthResponse = await fetch(`${API_URL}/health`)
    const healthData = await healthResponse.json()
    console.log('✅ Server is running')
    console.log(`   Response: ${JSON.stringify(healthData)}`)
  } catch (error) {
    console.error('❌ Server health check failed:', error.message)
    process.exit(1)
  }

  // Test 2: Login for each user
  console.log('\n2️⃣ Testing login for all users...')
  for (const user of testUsers) {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar_number: user.aadhaar_number,
          password: user.password,
        }),
      })

      const data = await response.json()

      if (response.ok && data.token) {
        console.log(`✅ ${user.role} login successful!`)
        console.log(`   Token: ${data.token.substring(0, 30)}...`)
        console.log(`   User: ${data.user.name} (${data.user.aadhaar_number})`)
      } else {
        console.error(`❌ ${user.role} login failed:`, data)
      }
    } catch (error) {
      console.error(`❌ Error testing ${user.role} login:`, error.message)
    }
  }

  // Test 3: Invalid credentials
  console.log('\n3️⃣ Testing invalid credentials...')
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aadhaar_number: '123412341234',
        password: 'wrongpassword',
      }),
    })

    const data = await response.json()
    if (response.status === 401) {
      console.log('✅ Invalid credentials correctly rejected')
    } else {
      console.error('❌ Expected 401 for invalid credentials, got:', response.status)
    }
  } catch (error) {
    console.error('❌ Error testing invalid login:', error.message)
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n✅ All login tests completed!')
  console.log('\n🌐 Server URL: http://localhost:3000')
  console.log('🔐 Login Endpoint: http://localhost:3000/api/auth/login')
  console.log('\n📋 Test Credentials:')
  console.log('   Patient:  123412341234 / patient123')
  console.log('   Hospital: 987698769876 / hospital123')
  console.log('   Admin:   111122223333 / admin123\n')
}

testLogin().catch(console.error)

