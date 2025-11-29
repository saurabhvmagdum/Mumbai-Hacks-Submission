import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class TestLogger {
  constructor(config) {
    this.config = config
    this.logs = []
    this.logFile = path.join(__dirname, '..', config.logging.outputFile || 'test-reports/test.log')
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFile)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }
  
  log(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data
    }
    
    this.logs.push(logEntry)
    
    // Write to console
    const consoleMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    if (level === 'error') {
      console.error(consoleMessage, data || '')
    } else if (level === 'warn') {
      console.warn(consoleMessage, data || '')
    } else if (this.config.logging.level === 'debug' || level !== 'debug') {
      console.log(consoleMessage, data || '')
    }
    
    // Write to file
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n')
    } catch (error) {
      console.error('Failed to write to log file:', error.message)
    }
  }
  
  debug(message, data = null) {
    this.log('debug', message, data)
  }
  
  info(message, data = null) {
    this.log('info', message, data)
  }
  
  warn(message, data = null) {
    this.log('warn', message, data)
  }
  
  error(message, data = null) {
    this.log('error', message, data)
  }
  
  testStart(suite, testName) {
    this.info(`Test started: ${suite} - ${testName}`)
  }
  
  testPass(suite, testName, duration) {
    this.info(`Test passed: ${suite} - ${testName} (${duration}ms)`)
  }
  
  testFail(suite, testName, error, duration) {
    this.error(`Test failed: ${suite} - ${testName} (${duration}ms)`, {
      error: error.message,
      stack: error.stack
    })
  }
  
  issueDetected(issue) {
    this.warn('Issue detected', issue)
  }
  
  fixApplied(fix) {
    this.info('Fix applied', fix)
  }
  
  iterationStart(iteration) {
    this.info(`=== Iteration ${iteration} started ===`)
  }
  
  iterationEnd(iteration, results) {
    this.info(`=== Iteration ${iteration} completed ===`, results)
  }
  
  getAllLogs() {
    return this.logs
  }
  
  clear() {
    this.logs = []
    if (fs.existsSync(this.logFile)) {
      fs.unlinkSync(this.logFile)
    }
  }
}

export default TestLogger


