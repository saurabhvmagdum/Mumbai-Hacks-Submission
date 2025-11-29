import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class IssueDetector {
  constructor() {
    this.issues = []
  }
  
  detectIssues(testResults) {
    this.issues = []
    
    // Analyze failed tests
    for (const failure of testResults.failed) {
      const issue = this.classifyIssue(failure)
      if (issue) {
        this.issues.push(issue)
      }
    }
    
    return this.issues
  }
  
  classifyIssue(failure) {
    const { test, error, status } = failure
    
    // Missing route (404 errors)
    if (status === 404 || error?.includes('404') || error?.includes('not found')) {
      return {
        type: 'missing_route',
        severity: 'high',
        test: test,
        error: error,
        status: status,
        fixable: true,
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // Authentication issues (401 errors)
    if (status === 401 || error?.includes('401') || error?.includes('Unauthorized')) {
      return {
        type: 'missing_authentication',
        severity: 'high',
        test: test,
        error: error,
        status: status,
        fixable: true,
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // Authorization issues (403 errors)
    if (status === 403 || error?.includes('403') || error?.includes('Forbidden')) {
      return {
        type: 'missing_authorization',
        severity: 'medium',
        test: test,
        error: error,
        status: status,
        fixable: true,
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // Validation errors (400 errors)
    if (status === 400 || error?.includes('400') || error?.includes('validation')) {
      return {
        type: 'missing_validation',
        severity: 'medium',
        test: test,
        error: error,
        status: status,
        fixable: true,
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // Response format issues
    if (error?.includes('property') || error?.includes('undefined') || error?.includes('null')) {
      return {
        type: 'incorrect_response_format',
        severity: 'medium',
        test: test,
        error: error,
        status: status,
        fixable: true,
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // CORS issues
    if (error?.includes('CORS') || error?.includes('cors') || error?.includes('Origin')) {
      return {
        type: 'cors_issue',
        severity: 'high',
        test: test,
        error: error,
        status: status,
        fixable: true,
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // Network/connection issues
    if (error?.includes('ECONNREFUSED') || error?.includes('network') || error?.includes('timeout')) {
      return {
        type: 'connection_issue',
        severity: 'high',
        test: test,
        error: error,
        status: status,
        fixable: false, // Server not running - not auto-fixable
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // Type mismatches
    if (error?.includes('Type') || error?.includes('type') || error?.includes('expected')) {
      return {
        type: 'type_mismatch',
        severity: 'low',
        test: test,
        error: error,
        status: status,
        fixable: true,
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // Generic error handling
    if (status >= 500) {
      return {
        type: 'server_error',
        severity: 'high',
        test: test,
        error: error,
        status: status,
        fixable: true,
        endpoint: this.extractEndpoint(test, error)
      }
    }
    
    // Unknown issue
    return {
      type: 'unknown',
      severity: 'medium',
      test: test,
      error: error,
      status: status,
      fixable: false,
      endpoint: this.extractEndpoint(test, error)
    }
  }
  
  extractEndpoint(test, error) {
    // Try to extract endpoint from test name or error
    const endpointPatterns = [
      /\/api\/[a-z\/-]+/gi,
      /\/[a-z\/-]+/gi,
      /'([^']+)'/g,
      /"([^"]+)"/g
    ]
    
    for (const pattern of endpointPatterns) {
      const matches = (test + ' ' + error).match(pattern)
      if (matches && matches.length > 0) {
        return matches[0].replace(/['"]/g, '')
      }
    }
    
    return null
  }
  
  getIssuesByType(type) {
    return this.issues.filter(issue => issue.type === type)
  }
  
  getFixableIssues() {
    return this.issues.filter(issue => issue.fixable)
  }
  
  getHighSeverityIssues() {
    return this.issues.filter(issue => issue.severity === 'high')
  }
  
  getAllIssues() {
    return this.issues
  }
  
  getSummary() {
    const summary = {
      total: this.issues.length,
      byType: {},
      bySeverity: {
        high: 0,
        medium: 0,
        low: 0
      },
      fixable: 0,
      notFixable: 0
    }
    
    for (const issue of this.issues) {
      // Count by type
      summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1
      
      // Count by severity
      summary.bySeverity[issue.severity] = (summary.bySeverity[issue.severity] || 0) + 1
      
      // Count fixable
      if (issue.fixable) {
        summary.fixable++
      } else {
        summary.notFixable++
      }
    }
    
    return summary
  }
}

export default IssueDetector


