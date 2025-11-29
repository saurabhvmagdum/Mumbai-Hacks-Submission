import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

console.log('🔍 Testing PostgreSQL Connection...\n')
console.log('Configuration:')
console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`)
console.log(`  Port: ${process.env.DB_PORT || 5432}`)
console.log(`  Database: ${process.env.DB_NAME || 'swasthya_db'}`)
console.log(`  User: ${process.env.DB_USER || 'postgres'}`)
console.log(`  Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'NOT SET'}\n`)

// Test 1: Try connecting to PostgreSQL server (without specifying database)
async function testServerConnection() {
  console.log('📡 Test 1: Connecting to PostgreSQL server...')
  const serverPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Default database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'swasthya2024',
  })

  try {
    const result = await serverPool.query('SELECT version()')
    console.log('✅ Server connection successful!')
    console.log(`   PostgreSQL version: ${result.rows[0].version.split(',')[0]}\n`)
    await serverPool.end()
    return true
  } catch (error) {
    console.error('❌ Server connection failed:', error.message)
    console.error(`   Error code: ${error.code}\n`)
    await serverPool.end()
    return false
  }
}

// Test 2: Check if database exists
async function checkDatabaseExists() {
  console.log('📊 Test 2: Checking if database exists...')
  const serverPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'swasthya2024',
  })

  try {
    const dbName = process.env.DB_NAME || 'swasthya_db'
    const result = await serverPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    )
    
    if (result.rows.length > 0) {
      console.log(`✅ Database '${dbName}' exists\n`)
      await serverPool.end()
      return true
    } else {
      console.log(`⚠️  Database '${dbName}' does NOT exist\n`)
      await serverPool.end()
      return false
    }
  } catch (error) {
    console.error('❌ Error checking database:', error.message)
    await serverPool.end()
    return false
  }
}

// Test 3: Try connecting to the target database
async function testDatabaseConnection() {
  console.log('🔌 Test 3: Connecting to target database...')
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'swasthya_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'swasthya2024',
  })

  try {
    const result = await pool.query('SELECT NOW()')
    console.log('✅ Database connection successful!')
    console.log(`   Server time: ${result.rows[0].now}\n`)
    await pool.end()
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error(`   Error code: ${error.code}\n`)
    await pool.end()
    return false
  }
}

// Main execution
async function main() {
  const serverOk = await testServerConnection()
  if (!serverOk) {
    console.log('💡 Suggestions:')
    console.log('   1. Check if PostgreSQL is running')
    console.log('   2. Verify the password in .env file')
    console.log('   3. Check if PostgreSQL is listening on the correct port')
    process.exit(1)
  }

  const dbExists = await checkDatabaseExists()
  if (!dbExists) {
    console.log('💡 Creating database...')
    const serverPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'swasthya2024',
    })
    
    try {
      const dbName = process.env.DB_NAME || 'swasthya_db'
      await serverPool.query(`CREATE DATABASE ${dbName}`)
      console.log(`✅ Database '${dbName}' created successfully!\n`)
      await serverPool.end()
    } catch (error) {
      console.error('❌ Failed to create database:', error.message)
      await serverPool.end()
      process.exit(1)
    }
  }

  const dbOk = await testDatabaseConnection()
  if (dbOk) {
    console.log('🎉 All tests passed! Database is ready.')
    process.exit(0)
  } else {
    process.exit(1)
  }
}

main().catch(console.error)

