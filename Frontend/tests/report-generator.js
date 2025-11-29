import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class ReportGenerator {
  constructor(config, logger) {
    this.config = config
    this.logger = logger
    this.reportDir = path.join(__dirname, '..', config.report.outputDir || 'test-reports')
    
    // Ensure report directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true })
    }
  }
  
  generateReport(testReport) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    switch (this.config.report.format) {
      case 'json':
        return this.generateJSONReport(testReport, timestamp)
      case 'html':
        return this.generateHTMLReport(testReport, timestamp)
      case 'text':
        return this.generateTextReport(testReport, timestamp)
      default:
        return this.generateJSONReport(testReport, timestamp)
    }
  }
  
  generateJSONReport(testReport, timestamp) {
    const reportFile = path.join(this.reportDir, `test-report-${timestamp}.json`)
    const reportData = {
      timestamp: new Date().toISOString(),
      ...testReport
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2))
    this.logger.info(`JSON report generated: ${reportFile}`)
    return reportFile
  }
  
  generateHTMLReport(testReport, timestamp) {
    const reportFile = path.join(this.reportDir, `test-report-${timestamp}.html`)
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${new Date().toLocaleString()}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .summary-card { background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; }
    .summary-card.failed { border-left-color: #f44336; }
    .summary-card h3 { margin: 0 0 10px 0; color: #333; }
    .summary-card .value { font-size: 2em; font-weight: bold; color: #4CAF50; }
    .summary-card.failed .value { color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #4CAF50; color: white; }
    tr:hover { background: #f5f5f5; }
    .passed { color: #4CAF50; }
    .failed { color: #f44336; }
    .iteration { margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 5px; }
    .issue { padding: 10px; margin: 5px 0; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 3px; }
    .fix { padding: 10px; margin: 5px 0; background: #d4edda; border-left: 4px solid #28a745; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Test Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    
    <div class="summary">
      <div class="summary-card ${testReport.success ? '' : 'failed'}">
        <h3>Status</h3>
        <div class="value">${testReport.success ? '✅ PASSED' : '❌ FAILED'}</div>
      </div>
      <div class="summary-card">
        <h3>Iterations</h3>
        <div class="value">${testReport.totalIterations}/${testReport.maxIterations}</div>
      </div>
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${testReport.summary.totalTests}</div>
      </div>
      <div class="summary-card">
        <h3>Passed</h3>
        <div class="value passed">${testReport.summary.totalPassed}</div>
      </div>
      <div class="summary-card failed">
        <h3>Failed</h3>
        <div class="value failed">${testReport.summary.totalFailed}</div>
      </div>
      <div class="summary-card">
        <h3>Fixes Applied</h3>
        <div class="value">${testReport.summary.totalFixes}</div>
      </div>
    </div>
    
    <h2>Iteration History</h2>
    ${testReport.iterationHistory.map((iter, idx) => `
      <div class="iteration">
        <h3>Iteration ${iter.iteration}</h3>
        <p><strong>Tests:</strong> ${iter.testResults.passed.length} passed, ${iter.testResults.failed.length} failed out of ${iter.testResults.total}</p>
        
        ${iter.issues.length > 0 ? `
          <h4>Issues Detected (${iter.issues.length})</h4>
          ${iter.issues.map(issue => `
            <div class="issue">
              <strong>${issue.type}</strong> - ${issue.test}<br>
              <small>${issue.error}</small>
            </div>
          `).join('')}
        ` : ''}
        
        ${iter.fixesApplied.length > 0 ? `
          <h4>Fixes Applied (${iter.fixesApplied.length})</h4>
          ${iter.fixesApplied.map(fix => `
            <div class="fix">
              <strong>${fix.action}</strong> - ${fix.file || fix.endpoint || 'N/A'}<br>
              <small>Type: ${fix.type}</small>
            </div>
          `).join('')}
        ` : ''}
      </div>
    `).join('')}
    
    <h2>Failed Tests</h2>
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Error</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${testReport.iterationHistory.flatMap(iter => 
          iter.testResults.failed.map(fail => `
            <tr>
              <td>${fail.test}</td>
              <td>${fail.error || 'N/A'}</td>
              <td>${fail.status || 'N/A'}</td>
            </tr>
          `)
        ).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `
    
    fs.writeFileSync(reportFile, html)
    this.logger.info(`HTML report generated: ${reportFile}`)
    return reportFile
  }
  
  generateTextReport(testReport, timestamp) {
    const reportFile = path.join(this.reportDir, `test-report-${timestamp}.txt`)
    
    let report = `TEST REPORT
Generated: ${new Date().toLocaleString()}
${'='.repeat(80)}

STATUS: ${testReport.success ? '✅ PASSED' : '❌ FAILED'}
Iterations: ${testReport.totalIterations}/${testReport.maxIterations}

SUMMARY
${'-'.repeat(80)}
Total Tests: ${testReport.summary.totalTests}
Passed: ${testReport.summary.totalPassed}
Failed: ${testReport.summary.totalFailed}
Issues Detected: ${testReport.summary.totalIssues}
Fixes Applied: ${testReport.summary.totalFixes}

ITERATION HISTORY
${'-'.repeat(80)}
`
    
    for (const iter of testReport.iterationHistory) {
      report += `
Iteration ${iter.iteration}
  Tests: ${iter.testResults.passed.length} passed, ${iter.testResults.failed.length} failed
  Issues: ${iter.issues.length}
  Fixes: ${iter.fixesApplied.length}
`
      
      if (iter.issues.length > 0) {
        report += `  Issues:\n`
        for (const issue of iter.issues) {
          report += `    - ${issue.type}: ${issue.test} (${issue.error})\n`
        }
      }
      
      if (iter.fixesApplied.length > 0) {
        report += `  Fixes:\n`
        for (const fix of iter.fixesApplied) {
          report += `    - ${fix.action}: ${fix.file || fix.endpoint || 'N/A'}\n`
        }
      }
    }
    
    fs.writeFileSync(reportFile, report)
    this.logger.info(`Text report generated: ${reportFile}`)
    return reportFile
  }
}

export default ReportGenerator


