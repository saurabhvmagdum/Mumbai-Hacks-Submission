/**
 * Standardized error handling utilities
 * Provides consistent error message extraction and display
 */

import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

/**
 * Extracts error message from various error types
 * @param error - The error object (can be AxiosError, Error, or unknown)
 * @returns Human-readable error message
 */
export function getErrorMessage(error: unknown): string {
  // Handle Axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>
    
    // Try to get error message from response
    if (axiosError.response?.data) {
      const data = axiosError.response.data
      if (typeof data === 'object') {
        if ('error' in data && typeof data.error === 'string') {
          return data.error
        }
        if ('message' in data && typeof data.message === 'string') {
          return data.message
        }
      }
    }
    
    // Use status text if available
    if (axiosError.response?.statusText) {
      return axiosError.response.statusText
    }
    
    // Use default axios error message
    if (axiosError.message) {
      return axiosError.message
    }
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error
  }
  
  // Default fallback
  return 'An unexpected error occurred'
}

/**
 * Shows an error toast with standardized error message
 * @param error - The error object
 * @param defaultMessage - Default message if error extraction fails
 */
export function showError(error: unknown, defaultMessage: string = 'An error occurred'): void {
  const message = getErrorMessage(error) || defaultMessage
  toast.error(message)
}

/**
 * Shows a success toast
 * @param message - Success message to display
 */
export function showSuccess(message: string): void {
  toast.success(message)
}

/**
 * Handles mutation errors with standardized error display
 * Can be used as onError callback in React Query mutations
 */
export function handleMutationError(error: unknown, defaultMessage: string = 'Operation failed'): void {
  showError(error, defaultMessage)
}

