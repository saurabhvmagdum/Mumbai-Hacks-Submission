import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class AutoFixEngine {
  constructor(config, logger) {
    this.config = config
    this.logger = logger
    this.fixesApplied = []
    this.backendRoutesDir = path.join(__dirname, '..', 'backend', 'routes')
    this.backendServerFile = path.join(__dirname, '..', 'backend', 'server.js')
  }
  
  async applyFixes(issues) {
    const fixableIssues = issues.filter(issue => issue.fixable && this.config.autoFix.enabled)
    
    this.logger.info(`Applying fixes for ${fixableIssues.length} fixable issues...`)
    
    for (const issue of fixableIssues) {
      try {
        await this.fixIssue(issue)
      } catch (error) {
        this.logger.error(`Failed to fix issue: ${issue.test}`, error)
      }
    }
    
    return this.fixesApplied
  }
  
  async fixIssue(issue) {
    switch (issue.type) {
      case 'missing_route':
        await this.fixMissingRoute(issue)
        break
      case 'missing_authentication':
        await this.fixMissingAuthentication(issue)
        break
      case 'missing_authorization':
        await this.fixMissingAuthorization(issue)
        break
      case 'missing_validation':
        await this.fixMissingValidation(issue)
        break
      case 'incorrect_response_format':
        await this.fixResponseFormat(issue)
        break
      case 'server_error':
        await this.fixErrorHandling(issue)
        break
      case 'cors_issue':
        await this.fixCORS(issue)
        break
      case 'type_mismatch':
        await this.fixTypeMismatch(issue)
        break
      default:
        this.logger.warn(`No auto-fix available for issue type: ${issue.type}`)
    }
  }
  
  async fixMissingRoute(issue) {
    if (!this.config.autoFix.fixMissingRoutes) return
    
    const endpoint = issue.endpoint
    if (!endpoint) return
    
    // Extract route path and method from endpoint
    const routeInfo = this.parseEndpoint(endpoint)
    if (!routeInfo) return
    
    // Determine which route file to create/update
    const routeFile = this.getRouteFile(routeInfo.path)
    const routeHandler = this.generateRouteHandler(routeInfo)
    
    // Check if route file exists
    if (!fs.existsSync(routeFile)) {
      // Create new route file
      const routeContent = this.generateRouteFile(routeInfo, routeHandler)
      fs.writeFileSync(routeFile, routeContent)
      this.logger.info(`Created route file: ${routeFile}`)
      this.fixesApplied.push({
        type: 'missing_route',
        action: 'created_route_file',
        file: routeFile,
        endpoint: endpoint
      })
    } else {
      // Add route to existing file
      const existingContent = fs.readFileSync(routeFile, 'utf8')
      if (!existingContent.includes(routeInfo.path)) {
        const updatedContent = this.addRouteToFile(existingContent, routeInfo, routeHandler)
        fs.writeFileSync(routeFile, updatedContent)
        this.logger.info(`Added route to file: ${routeFile}`)
        this.fixesApplied.push({
          type: 'missing_route',
          action: 'added_route',
          file: routeFile,
          endpoint: endpoint
        })
      }
    }
    
    // Register route in server.js if needed
    await this.registerRouteInServer(routeFile, routeInfo.path)
  }
  
  async fixMissingAuthentication(issue) {
    if (!this.config.autoFix.fixMissingMiddleware) return
    
    const endpoint = issue.endpoint
    if (!endpoint) return
    
    const routeInfo = this.parseEndpoint(endpoint)
    if (!routeInfo) return
    
    const routeFile = this.getRouteFile(routeInfo.path)
    if (!fs.existsSync(routeFile)) return
    
    const content = fs.readFileSync(routeFile, 'utf8')
    
    // Check if authenticateToken is already imported
    if (!content.includes('authenticateToken')) {
      const updatedContent = this.addAuthenticationMiddleware(content, routeInfo)
      fs.writeFileSync(routeFile, updatedContent)
      this.logger.info(`Added authentication middleware to: ${routeFile}`)
      this.fixesApplied.push({
        type: 'missing_authentication',
        action: 'added_auth_middleware',
        file: routeFile,
        endpoint: endpoint
      })
    }
  }
  
  async fixMissingAuthorization(issue) {
    if (!this.config.autoFix.fixMissingMiddleware) return
    
    const endpoint = issue.endpoint
    if (!endpoint) return
    
    const routeInfo = this.parseEndpoint(endpoint)
    if (!routeInfo) return
    
    const routeFile = this.getRouteFile(routeInfo.path)
    if (!fs.existsSync(routeFile)) return
    
    const content = fs.readFileSync(routeFile, 'utf8')
    
    // Determine required role from endpoint path
    const requiredRole = this.determineRequiredRole(routeInfo.path)
    
    if (requiredRole && !content.includes(`authorizeRole('${requiredRole}')`)) {
      const updatedContent = this.addAuthorizationMiddleware(content, routeInfo, requiredRole)
      fs.writeFileSync(routeFile, updatedContent)
      this.logger.info(`Added authorization middleware to: ${routeFile}`)
      this.fixesApplied.push({
        type: 'missing_authorization',
        action: 'added_authz_middleware',
        file: routeFile,
        endpoint: endpoint,
        role: requiredRole
      })
    }
  }
  
  async fixMissingValidation(issue) {
    if (!this.config.autoFix.fixMissingValidation) return
    
    const endpoint = issue.endpoint
    if (!endpoint) return
    
    const routeInfo = this.parseEndpoint(endpoint)
    if (!routeInfo || routeInfo.method !== 'POST') return
    
    const routeFile = this.getRouteFile(routeInfo.path)
    if (!fs.existsSync(routeFile)) return
    
    const content = fs.readFileSync(routeFile, 'utf8')
    
    if (!content.includes('express-validator') && !content.includes('validationResult')) {
      const updatedContent = this.addValidationMiddleware(content, routeInfo)
      fs.writeFileSync(routeFile, updatedContent)
      this.logger.info(`Added validation middleware to: ${routeFile}`)
      this.fixesApplied.push({
        type: 'missing_validation',
        action: 'added_validation',
        file: routeFile,
        endpoint: endpoint
      })
    }
  }
  
  async fixResponseFormat(issue) {
    if (!this.config.autoFix.fixResponseFormats) return
    
    // Response format fixes are typically handled in route handlers
    // This would require more complex analysis
    this.logger.warn(`Response format fix for ${issue.endpoint} requires manual review`)
  }
  
  async fixErrorHandling(issue) {
    if (!this.config.autoFix.fixErrorHandling) return
    
    const endpoint = issue.endpoint
    if (!endpoint) return
    
    const routeInfo = this.parseEndpoint(endpoint)
    if (!routeInfo) return
    
    const routeFile = this.getRouteFile(routeInfo.path)
    if (!fs.existsSync(routeFile)) return
    
    const content = fs.readFileSync(routeFile, 'utf8')
    
    // Check if route handler has try-catch
    if (!content.includes('try {') || !content.includes('catch')) {
      const updatedContent = this.addErrorHandling(content, routeInfo)
      fs.writeFileSync(routeFile, updatedContent)
      this.logger.info(`Added error handling to: ${routeFile}`)
      this.fixesApplied.push({
        type: 'server_error',
        action: 'added_error_handling',
        file: routeFile,
        endpoint: endpoint
      })
    }
  }
  
  async fixCORS(issue) {
    if (!this.config.autoFix.fixCORS) return
    
    if (!fs.existsSync(this.backendServerFile)) return
    
    const content = fs.readFileSync(this.backendServerFile, 'utf8')
    
    // Check CORS configuration
    if (!content.includes('cors') || content.includes('origin: "*"')) {
      const updatedContent = this.fixCORSConfig(content)
      fs.writeFileSync(this.backendServerFile, updatedContent)
      this.logger.info(`Fixed CORS configuration in server.js`)
      this.fixesApplied.push({
        type: 'cors_issue',
        action: 'fixed_cors_config',
        file: this.backendServerFile
      })
    }
  }
  
  async fixTypeMismatch(issue) {
    if (!this.config.autoFix.fixTypes) return
    
    // Type fixes would require TypeScript analysis
    // This is a placeholder for future implementation
    this.logger.warn(`Type mismatch fix for ${issue.endpoint} requires manual review`)
  }
  
  // Helper methods
  parseEndpoint(endpoint) {
    if (!endpoint) return null
    
    // Extract method and path from endpoint
    const methodMatch = endpoint.match(/(GET|POST|PUT|DELETE|PATCH)\s+(.+)/i)
    if (methodMatch) {
      return {
        method: methodMatch[1].toLowerCase(),
        path: methodMatch[2].split('?')[0]
      }
    }
    
    // Try to infer from path
    if (endpoint.startsWith('/api/')) {
      return {
        method: 'get', // Default
        path: endpoint.split('?')[0]
      }
    }
    
    return null
  }
  
  getRouteFile(path) {
    // Map API paths to route files
    if (path.startsWith('/api/auth')) {
      return path.join(this.backendRoutesDir, 'auth.js')
    } else if (path.startsWith('/api/dashboard')) {
      return path.join(this.backendRoutesDir, 'dashboard.js')
    } else if (path.startsWith('/api/forecast')) {
      return path.join(this.backendRoutesDir, 'forecast.js')
    } else if (path.startsWith('/api/triage')) {
      return path.join(this.backendRoutesDir, 'triage.js')
    } else if (path.startsWith('/api/eror')) {
      return path.join(this.backendRoutesDir, 'eror.js')
    } else if (path.startsWith('/api/scheduling')) {
      return path.join(this.backendRoutesDir, 'scheduling.js')
    }
    
    // Default to a generic route file
    return path.join(this.backendRoutesDir, 'routes.js')
  }
  
  generateRouteHandler(routeInfo) {
    const method = routeInfo.method
    const pathName = routeInfo.path.split('/').pop() || 'index'
    
    return `
router.${method}('${routeInfo.path}', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement ${pathName} handler
    res.json({ message: '${pathName} endpoint', data: [] })
  } catch (error) {
    console.error('${pathName} error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
`
  }
  
  generateRouteFile(routeInfo, handler) {
    return `import express from 'express'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'

const router = express.Router()

${handler}

export default router
`
  }
  
  addRouteToFile(content, routeInfo, handler) {
    // Add route before export default
    const exportIndex = content.lastIndexOf('export default')
    if (exportIndex > 0) {
      return content.slice(0, exportIndex) + handler + '\n\n' + content.slice(exportIndex)
    }
    return content + '\n' + handler
  }
  
  async registerRouteInServer(routeFile, routePath) {
    if (!fs.existsSync(this.backendServerFile)) return
    
    const content = fs.readFileSync(this.backendServerFile, 'utf8')
    const routeName = path.basename(routeFile, '.js')
    const routeVar = routeName + 'Routes'
    
    // Check if route is already imported
    if (content.includes(`import ${routeVar}`)) return
    
    // Add import
    const importLine = `import ${routeVar} from './routes/${routeName}.js'`
    const lastImportIndex = content.lastIndexOf('import')
    if (lastImportIndex >= 0) {
      const nextLineIndex = content.indexOf('\n', lastImportIndex)
      const updatedContent = content.slice(0, nextLineIndex + 1) + importLine + '\n' + content.slice(nextLineIndex + 1)
      fs.writeFileSync(this.backendServerFile, updatedContent)
    }
    
    // Add route registration
    const routeRegistration = `app.use('${routePath.split('/api')[0] || routePath}', apiLimiter, ${routeVar})`
    const routesSection = content.indexOf('// Routes with rate limiting')
    if (routesSection >= 0) {
      const routesEndIndex = content.indexOf('\n', content.indexOf('app.use', routesSection))
      const updatedContent = content.slice(0, routesEndIndex + 1) + routeRegistration + '\n' + content.slice(routesEndIndex + 1)
      fs.writeFileSync(this.backendServerFile, updatedContent)
    }
  }
  
  addAuthenticationMiddleware(content, routeInfo) {
    // Add import if missing
    if (!content.includes('authenticateToken')) {
      const importIndex = content.indexOf('import express')
      if (importIndex >= 0) {
        const importEnd = content.indexOf('\n', importIndex)
        content = content.slice(0, importEnd) + "\nimport { authenticateToken } from '../middleware/auth.js'" + content.slice(importEnd)
      }
    }
    
    // Add middleware to route
    const routePattern = new RegExp(`router\\.${routeInfo.method}\\('${routeInfo.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g')
    content = content.replace(routePattern, (match) => {
      return match + ", authenticateToken"
    })
    
    return content
  }
  
  addAuthorizationMiddleware(content, routeInfo, role) {
    // Add import if missing
    if (!content.includes('authorizeRole')) {
      const importIndex = content.indexOf("import { authenticateToken")
      if (importIndex >= 0) {
        content = content.replace("import { authenticateToken }", "import { authenticateToken, authorizeRole }")
      }
    }
    
    // Add middleware to route
    const routePattern = new RegExp(`router\\.${routeInfo.method}\\('${routeInfo.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g')
    content = content.replace(routePattern, (match) => {
      return match + ", authenticateToken, authorizeRole('" + role + "')"
    })
    
    return content
  }
  
  addValidationMiddleware(content, routeInfo) {
    // Add import
    if (!content.includes('express-validator')) {
      const importIndex = content.indexOf('import express')
      if (importIndex >= 0) {
        const importEnd = content.indexOf('\n', importIndex)
        content = content.slice(0, importEnd) + "\nimport { body, validationResult } from 'express-validator'" + content.slice(importEnd)
      }
    }
    
    // Add validation to POST routes
    if (routeInfo.method === 'post') {
      const routePattern = new RegExp(`router\\.post\\('${routeInfo.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g')
      content = content.replace(routePattern, (match) => {
        return match + ",\n  [\n    // TODO: Add validation rules\n  ],"
      })
    }
    
    return content
  }
  
  addErrorHandling(content, routeInfo) {
    // Wrap route handler in try-catch
    const routePattern = new RegExp(`router\\.${routeInfo.method}\\('${routeInfo.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^}]+)`, 'gs')
    content = content.replace(routePattern, (match) => {
      if (!match.includes('try {')) {
        return match.replace(/async\s*\(req,\s*res\)\s*=>\s*\{/, 'async (req, res) => {\n    try {')
          .replace(/\}\s*\)$/, '    } catch (error) {\n      console.error(\'Error:\', error)\n      res.status(500).json({ error: \'Internal server error\' })\n    }\n  })')
      }
      return match
    })
    
    return content
  }
  
  fixCORSConfig(content) {
    // Replace wildcard CORS with specific origin
    content = content.replace(/origin:\s*['"]\*['"]/g, "origin: process.env.FRONTEND_URL || 'http://localhost:8000'")
    return content
  }
  
  determineRequiredRole(path) {
    if (path.includes('/admin') || path.includes('/scheduling')) {
      return 'superadmin'
    } else if (path.includes('/forecast') || path.includes('/triage') || path.includes('/eror')) {
      return 'hospital'
    }
    return null
  }
  
  getFixesApplied() {
    return this.fixesApplied
  }
}

export default AutoFixEngine


