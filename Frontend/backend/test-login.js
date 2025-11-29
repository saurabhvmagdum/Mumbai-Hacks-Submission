import axios from 'axios'

const API_URL = 'http://localhost:3000'

async function testLogin() {
  console.log('🧪 Testing Login...\n')

  const testUsers = [
    { aadhaar: '123412341234', password: 'patient123', role: 'patient' },
    { aadhaar: '987698769876', password: 'hospital123', role: 'hospital' },
    { aadhaar: '111122223333', password: 'admin123', role: 'superadmin' },
  ]

  for (const user of testUsers) {
    try {
      console.log(`Testing ${user.role} login...`)
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        aadhaar_number: user.aadhaar,
        password: user.password,
      })

      if (response.data.token) {
        console.log(`✅ ${user.role} login successful!`)
        console.log(`   Token: ${response.data.token.substring(0, 20)}...`)
        console.log(`   User: ${response.data.user.name}`)
      }
    } catch (error) {
      console.error(`❌ ${user.role} login failed:`)
      console.error(`   ${error.response?.data?.error || error.message}`)
    }
    console.log('')
  }
}

// Check if server is running
axios
  .get(`${API_URL}/health`)
  .then(() => {
    console.log('✅ Server is running\n')
    testLogin()
  })
  .catch(() => {
    console.error('❌ Server is not running on http://localhost:3000')
    console.error('Please start the backend server first: npm run dev')
    process.exit(1)
  })

