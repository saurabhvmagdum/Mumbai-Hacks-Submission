import { config, updateConfigFromArgs } from './test-config.js'
import TestLogger from './test-logger.js'
import IssueDetector from './issue-detector.js'
import AutoFixEngine from './auto-fix-engine.js'
import FixVerifier from './fix-verifier.js'
import { runAPITestSuite } from '../backend/tests/api-test-suite.js'
import { runUITestSuite } from '../frontend/tests/ui-test-suite.js'
import { runIntegrationTestSuite } from './integration-test-suite.js'

// Update config from command line arguments
updateConfigFromArgs(process.argv.slice(2))

const logger = new TestLogger(config)
const issueDetector = new IssueDetector()
const autoFixEngine = new AutoFixEngine(config, logger)
const fixVerifier = new FixVerifier(logger)

let iteration = 0
const iterationHistory = []

async function runTestSuite(suiteName) {
  logger.info(`Running ${suiteName} test suite...`)
  
  try {
    switch (suiteName) {
      case 'api':
        return await runAPITestSuite()
      case 'ui':
        return await runUITestSuite()
      case 'integration':
        return await runIntegrationTestSuite()
      default:
        throw new Error(`Unknown test suite: ${suiteName}`)
    }
  } catch (error) {
    logger.error(`Error running ${suiteName} test suite:`, error)
    return {
      passed: [],
      failed: [{ test: `${suiteName} suite`, error: error.message }],
      total: 1
    }
  }
}

async function runAllTests() {
  const allResults = {
    api: { passed: [], failed: [], total: 0 },
    ui: { passed: [], failed: [], total: 0 },
    integration: { passed: [], failed: [], total: 0 }
  }
  
  if (config.suites.api) {
    allResults.api = await runTestSuite('api')
  }
  
  if (config.suites.ui) {
    allResults.ui = await runTestSuite('ui')
  }
  
  if (config.suites.integration) {
    allResults.integration = await runTestSuite('integration')
  }
  
  // Combine all results
  const combinedResults = {
    passed: [
      ...allResults.api.passed,
      ...allResults.ui.passed,
      ...allResults.integration.passed
    ],
    failed: [
      ...allResults.api.failed,
      ...allResults.ui.failed,
      ...allResults.integration.failed
    ],
    total: allResults.api.total + allResults.ui.total + allResults.integration.total
  }
  
  return combinedResults
}

async function runIteration() {
  iteration++
  logger.iterationStart(iteration)
  
  // Run all test suites
  const testResults = await runAllTests()
  
  // Check if all tests passed
  if (testResults.failed.length === 0) {
    logger.info('🎉 All tests passed!')
    return {
      success: true,
      iteration,
      results: testResults
    }
  }
  
  // Detect issues
  const issues = issueDetector.detectIssues(testResults)
  logger.info(`Detected ${issues.length} issues`)
  
  // Apply fixes
  const fixesApplied = await autoFixEngine.applyFixes(issues)
  logger.info(`Applied ${fixesApplied.length} fixes`)
  
  // Verify fixes
  const verificationResults = await fixVerifier.verifyFixes(fixesApplied, issues)
  logger.info(`Verified ${verificationResults.verified.length} fixes`)
  
  // Store iteration results
  const iterationResult = {
    iteration,
    testResults,
    issues,
    fixesApplied,
    verificationResults
  }
  
  iterationHistory.push(iterationResult)
  logger.iterationEnd(iteration, iterationResult)
  
  return {
    success: false,
    iteration,
    results: testResults,
    issues,
    fixesApplied
  }
}

async function main() {
  logger.info('🚀 Starting Automated Test, Verify, and Fix Loop')
  logger.info(`Max iterations: ${config.maxIterations}`)
  logger.info(`Test suites: ${Object.keys(config.suites).filter(k => config.suites[k]).join(', ')}`)
  
  let allTestsPassed = false
  
  while (iteration < config.maxIterations && !allTestsPassed) {
    const result = await runIteration()
    
    if (result.success) {
      allTestsPassed = true
      break
    }
    
    // Wait a bit before next iteration to allow server to restart if needed
    if (iteration < config.maxIterations) {
      logger.info('Waiting 2 seconds before next iteration...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  // Generate final report
  const finalReport = {
    success: allTestsPassed,
    totalIterations: iteration,
    maxIterations: config.maxIterations,
    iterationHistory,
    summary: {
      totalTests: iterationHistory.length > 0 ? iterationHistory.reduce((sum, iter) => sum + iter.testResults.total, 0) : 0,
      totalPassed: iterationHistory.length > 0 ? iterationHistory.reduce((sum, iter) => sum + iter.testResults.passed.length, 0) : 0,
      totalFailed: iterationHistory.length > 0 ? iterationHistory.reduce((sum, iter) => sum + iter.testResults.failed.length, 0) : 0,
      totalIssues: iterationHistory.length > 0 ? iterationHistory.reduce((sum, iter) => sum + iter.issues.length, 0) : 0,
      totalFixes: iterationHistory.length > 0 ? iterationHistory.reduce((sum, iter) => sum + iter.fixesApplied.length, 0) : 0
    }
  }
  
  logger.info('\n📊 Final Report:')
  logger.info(`Success: ${finalReport.success ? '✅' : '❌'}`)
  logger.info(`Iterations: ${finalReport.totalIterations}/${finalReport.maxIterations}`)
  logger.info(`Total Tests: ${finalReport.summary.totalTests}`)
  logger.info(`Passed: ${finalReport.summary.totalPassed}`)
  logger.info(`Failed: ${finalReport.summary.totalFailed}`)
  logger.info(`Issues Detected: ${finalReport.summary.totalIssues}`)
  logger.info(`Fixes Applied: ${finalReport.summary.totalFixes}`)
  
  // Generate report file
  const reportGenerator = new ReportGenerator(config, logger)
  const reportFile = reportGenerator.generateReport(finalReport)
  logger.info(`\n📄 Report saved to: ${reportFile}`)
  
  return finalReport
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((report) => {
    process.exit(report.success ? 0 : 1)
  }).catch((error) => {
    logger.error('Fatal error in test runner:', error)
    process.exit(1)
  })
}

export { main as runTestRunner }

