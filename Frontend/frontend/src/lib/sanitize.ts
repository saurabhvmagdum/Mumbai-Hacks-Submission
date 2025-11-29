/**
 * Input sanitization utilities
 * Prevents XSS attacks and validates user inputs
 */

/**
 * Sanitizes a string input by removing potentially dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

/**
 * Sanitizes a numeric input
 * @param input - The value to sanitize
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Sanitized number or null if invalid
 */
export function sanitizeNumber(
  input: string | number,
  min?: number,
  max?: number
): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input
  
  if (isNaN(num)) {
    return null
  }
  
  if (min !== undefined && num < min) {
    return null
  }
  
  if (max !== undefined && num > max) {
    return null
  }
  
  return num
}

/**
 * Sanitizes an integer input
 * @param input - The value to sanitize
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Sanitized integer or null if invalid
 */
export function sanitizeInteger(
  input: string | number,
  min?: number,
  max?: number
): number | null {
  const num = typeof input === 'string' ? parseInt(input, 10) : Math.floor(input)
  
  if (isNaN(num)) {
    return null
  }
  
  if (min !== undefined && num < min) {
    return null
  }
  
  if (max !== undefined && num > max) {
    return null
  }
  
  return num
}

/**
 * Sanitizes an array of strings
 * @param input - Array of strings or comma-separated string
 * @returns Array of sanitized strings
 */
export function sanitizeStringArray(input: string | string[]): string[] {
  const array = typeof input === 'string' 
    ? input.split(',').map(s => s.trim()).filter(Boolean)
    : input
  
  return array.map(sanitizeString).filter(Boolean)
}

/**
 * Sanitizes a date string
 * @param input - Date string to sanitize
 * @returns Valid date string or null
 */
export function sanitizeDate(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null
  }
  
  const date = new Date(input)
  if (isNaN(date.getTime())) {
    return null
  }
  
  return date.toISOString().split('T')[0]
}

/**
 * Sanitizes an email address (basic validation)
 * @param input - Email string to sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null
  }
  
  const email = sanitizeString(input).toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    return null
  }
  
  return email
}

