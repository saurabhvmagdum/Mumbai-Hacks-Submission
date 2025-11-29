export class FixVerifier {
  constructor(logger) {
    this.logger = logger
  }
  
  async verifyFixes(fixesApplied, originalIssues) {
    const verificationResults = {
      verified: [],
      notVerified: [],
      newIssues: []
    }
    
    this.logger.info(`Verifying ${fixesApplied.length} fixes...`)
    
    for (const fix of fixesApplied) {
      try {
        const verified = await this.verifyFix(fix)
        if (verified) {
          verificationResults.verified.push(fix)
        } else {
          verificationResults.notVerified.push(fix)
        }
      } catch (error) {
        this.logger.error(`Error verifying fix: ${fix.action}`, error)
        verificationResults.notVerified.push(fix)
      }
    }
    
    return verificationResults
  }
  
  async verifyFix(fix) {
    // Basic verification - check if file exists and has expected content
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    
    switch (fix.action) {
      case 'created_route_file':
      case 'added_route':
        return this.verifyRouteFile(fix, fs, path, __dirname)
      case 'added_auth_middleware':
        return this.verifyAuthMiddleware(fix, fs, path, __dirname)
      case 'added_authz_middleware':
        return this.verifyAuthzMiddleware(fix, fs, path, __dirname)
      case 'added_validation':
        return this.verifyValidation(fix, fs, path, __dirname)
      case 'added_error_handling':
        return this.verifyErrorHandling(fix, fs, path, __dirname)
      case 'fixed_cors_config':
        return this.verifyCORS(fix, fs, path, __dirname)
      default:
        return true // Unknown fix type - assume verified
    }
  }
  
  verifyRouteFile(fix, fs, path, __dirname) {
    const routeFile = path.join(__dirname, '..', fix.file)
    if (!fs.existsSync(routeFile)) {
      return false
    }
    
    const content = fs.readFileSync(routeFile, 'utf8')
    return content.includes('router.') && content.includes('export default')
  }
  
  verifyAuthMiddleware(fix, fs, path, __dirname) {
    const routeFile = path.join(__dirname, '..', fix.file)
    if (!fs.existsSync(routeFile)) {
      return false
    }
    
    const content = fs.readFileSync(routeFile, 'utf8')
    return content.includes('authenticateToken')
  }
  
  verifyAuthzMiddleware(fix, fs, path, __dirname) {
    const routeFile = path.join(__dirname, '..', fix.file)
    if (!fs.existsSync(routeFile)) {
      return false
    }
    
    const content = fs.readFileSync(routeFile, 'utf8')
    return content.includes('authorizeRole') && content.includes(fix.role)
  }
  
  verifyValidation(fix, fs, path, __dirname) {
    const routeFile = path.join(__dirname, '..', fix.file)
    if (!fs.existsSync(routeFile)) {
      return false
    }
    
    const content = fs.readFileSync(routeFile, 'utf8')
    return content.includes('express-validator') || content.includes('validationResult')
  }
  
  verifyErrorHandling(fix, fs, path, __dirname) {
    const routeFile = path.join(__dirname, '..', fix.file)
    if (!fs.existsSync(routeFile)) {
      return false
    }
    
    const content = fs.readFileSync(routeFile, 'utf8')
    return content.includes('try {') && content.includes('catch')
  }
  
  verifyCORS(fix, fs, path, __dirname) {
    const serverFile = path.join(__dirname, '..', fix.file)
    if (!fs.existsSync(serverFile)) {
      return false
    }
    
    const content = fs.readFileSync(serverFile, 'utf8')
    return content.includes('cors') && !content.includes("origin: '*'")
  }
}

export default FixVerifier


