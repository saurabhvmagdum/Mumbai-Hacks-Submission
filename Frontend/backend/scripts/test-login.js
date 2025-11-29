import 'dotenv/config'

const API_URL = `http://localhost:${process.env.PORT || 3000}`

async function testLogin() {
  console.log('🧪 Testing Login Functionality...\n')
  
  // Test credentials from init-db
  const testUsers = [
    { aadhaar_number: '123412341234', password: 'patient123', role: 'patient' },
    { aadhaar_number: '987698769876', password: 'hospital123', role: 'hospital' },
    { aadhaar_number: '111122223333', password: 'admin123', role: 'superadmin' },
  ]

  for (const user of testUsers) {
    console.log(`🔐 Testing login for ${user.role}...`)
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
        console.log(`   Token: ${data.token.substring(0, 20)}...`)
        console.log(`   User: ${data.user.name} (${data.user.aadhaar_number})\n`)
      } else {
        console.error(`❌ ${user.role} login failed:`, data)
        console.log('')
      }
    } catch (error) {
      console.error(`❌ Error testing ${user.role} login:`, error.message)
      console.log('')
    }
  }

  // Test invalid credentials
  console.log('🔐 Testing invalid credentials...')
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
      console.log('✅ Invalid credentials correctly rejected\n')
    } else {
      console.error('❌ Expected 401 for invalid credentials, got:', response.status)
    }
  } catch (error) {
    console.error('❌ Error testing invalid login:', error.message)
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_URL}/health`)
    if (response.ok) {
      console.log('✅ Server is running\n')
      return true
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start it with: npm run dev')
    console.error(`   Error: ${error.message}\n`)
    return false
  }
}

async function main() {
  const serverRunning = await checkServer()
  if (serverRunning) {
    await testLogin()
    console.log('🎉 Login tests complete!')
  } else {
    process.exit(1)
  }
}

main().catch(console.error)

