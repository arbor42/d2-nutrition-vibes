import { ref, computed, watch, onErrorCaptured } from 'vue'

import { useUIStore } from '@/stores/useUIStore'

// Enhanced error handling composable for Phase 5
export function useErrorHandling(options = {}) {
  const {
    showNotifications = true,
    logToConsole = true,
    retryAttempts = 3,
    retryDelay = 1000,
    persistErrors = true
  } = options

  const uiStore = useUIStore()

  // Error state
  const errors = ref([])
  const globalError = ref(null)
  const errorCounts = ref(new Map())
  const retryHistory = ref(new Map())
  const errorMetrics = ref({
    total: 0,
    byType: {},
    byComponent: {},
    resolved: 0,
    unresolved: 0
  })

  // Error categories
  const ERROR_TYPES = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    RUNTIME: 'runtime',
    PERMISSION: 'permission',
    DATA: 'data',
    VISUALIZATION: 'visualization',
    STORE: 'store',
    UNKNOWN: 'unknown'
  }

  const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }

  // Computed properties
  const hasErrors = computed(() => errors.value.length > 0)
  const hasGlobalError = computed(() => globalError.value !== null)
  const criticalErrors = computed(() => 
    errors.value.filter(error => error.severity === ERROR_SEVERITY.CRITICAL)
  )
  const unresolvedErrors = computed(() => 
    errors.value.filter(error => !error.resolved)
  )

  // Error classification
  const classifyError = (error, context = {}) => {
    let type = ERROR_TYPES.UNKNOWN
    let severity = ERROR_SEVERITY.MEDIUM

    const message = error.message || error.toString()
    const stack = error.stack || ''

    // Network errors
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('timeout') ||
        message.includes('connection')) {
      type = ERROR_TYPES.NETWORK
      severity = ERROR_SEVERITY.HIGH
    }
    // Validation errors
    else if (message.includes('validation') || 
             message.includes('invalid') || 
             message.includes('required')) {
      type = ERROR_TYPES.VALIDATION
      severity = ERROR_SEVERITY.LOW
    }
    // Permission errors
    else if (message.includes('permission') || 
             message.includes('unauthorized') || 
             message.includes('forbidden')) {
      type = ERROR_TYPES.PERMISSION
      severity = ERROR_SEVERITY.HIGH
    }
    // Data errors
    else if (message.includes('data') || 
             message.includes('parse') || 
             message.includes('format')) {
      type = ERROR_TYPES.DATA
      severity = ERROR_SEVERITY.MEDIUM
    }
    // Visualization errors
    else if (stack.includes('d3') || 
             stack.includes('visualization') ||
             context.component?.includes('Chart') ||
             context.component?.includes('Map')) {
      type = ERROR_TYPES.VISUALIZATION
      severity = ERROR_SEVERITY.MEDIUM
    }
    // Store errors
    else if (stack.includes('store') || 
             stack.includes('pinia') ||
             context.store) {
      type = ERROR_TYPES.STORE
      severity = ERROR_SEVERITY.HIGH
    }
    // Runtime errors
    else if (error instanceof TypeError || 
             error instanceof ReferenceError || 
             error instanceof RangeError) {
      type = ERROR_TYPES.RUNTIME
      severity = ERROR_SEVERITY.HIGH
    }

    // Increase severity for repeated errors
    const errorKey = `${type}_${message.substring(0, 50)}`
    const count = errorCounts.value.get(errorKey) || 0
    if (count > 3) {
      severity = ERROR_SEVERITY.CRITICAL
    }

    return { type, severity }
  }

  // Create standardized error object
  const createErrorObject = (error, context = {}) => {
    const { type, severity } = classifyError(error, context)
    
    return {
      id: Date.now() + Math.random(),
      message: error.message || error.toString(),
      stack: error.stack || '',
      type,
      severity,
      context,
      timestamp: new Date(),
      resolved: false,
      retryCount: 0,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      component: context.component || 'unknown',
      action: context.action || 'unknown'
    }
  }

  // Handle error
  const handleError = (error, context = {}) => {
    const errorObj = createErrorObject(error, context)
    
    // Update error counts
    const errorKey = `${errorObj.type}_${errorObj.message.substring(0, 50)}`
    errorCounts.value.set(errorKey, (errorCounts.value.get(errorKey) || 0) + 1)
    
    // Add to errors list
    errors.value.push(errorObj)
    
    // Update metrics
    updateErrorMetrics(errorObj)
    
    // Log to console if enabled
    if (logToConsole) {
      console.error(`[${errorObj.severity.toUpperCase()}] ${errorObj.type}:`, errorObj.message)
      if (errorObj.stack) {
        console.error('Stack trace:', errorObj.stack)
      }
      console.error('Context:', errorObj.context)
    }
    
    // Show notification if enabled
    if (showNotifications) {
      showErrorNotification(errorObj)
    }
    
    // Set global error for critical errors
    if (errorObj.severity === ERROR_SEVERITY.CRITICAL) {
      globalError.value = errorObj
    }
    
    // Persist error if enabled
    if (persistErrors) {
      persistError(errorObj)
    }
    
    // Limit error history
    if (errors.value.length > 100) {
      errors.value = errors.value.slice(-50)
    }
    
    return errorObj
  }

  // Update error metrics
  const updateErrorMetrics = (errorObj) => {
    errorMetrics.value.total++
    
    // By type
    if (!errorMetrics.value.byType[errorObj.type]) {
      errorMetrics.value.byType[errorObj.type] = 0
    }
    errorMetrics.value.byType[errorObj.type]++
    
    // By component
    if (!errorMetrics.value.byComponent[errorObj.component]) {
      errorMetrics.value.byComponent[errorObj.component] = 0
    }
    errorMetrics.value.byComponent[errorObj.component]++
    
    // Update resolved/unresolved counts
    errorMetrics.value.unresolved = unresolvedErrors.value.length
    errorMetrics.value.resolved = errors.value.length - errorMetrics.value.unresolved
  }

  // Show error notification
  const showErrorNotification = (errorObj) => {
    let title = 'Error'
    let type = 'error'
    let duration = 5000
    
    switch (errorObj.severity) {
      case ERROR_SEVERITY.LOW:
        title = 'Warning'
        type = 'warning'
        duration = 3000
        break
      case ERROR_SEVERITY.MEDIUM:
        title = 'Error'
        type = 'error'
        duration = 5000
        break
      case ERROR_SEVERITY.HIGH:
        title = 'Serious Error'
        type = 'error'
        duration = 8000
        break
      case ERROR_SEVERITY.CRITICAL:
        title = 'Critical Error'
        type = 'error'
        duration = 0 // Don't auto-hide
        break
    }
    
  }

  // Show error details
  const showErrorDetails = (errorId) => {
    const error = errors.value.find(e => e.id === errorId)
    if (!error) return
    
    uiStore.openModal('error-details', {
      error,
      title: 'Error Details',
      component: 'ErrorDetailsModal'
    })
  }

  // Retry operation
  const retryOperation = async (errorId) => {
    const error = errors.value.find(e => e.id === errorId)
    if (!error?.context.retryFn) return
    
    const retryKey = `${error.type}_${error.message.substring(0, 30)}`
    const retryCount = retryHistory.value.get(retryKey) || 0
    
    if (retryCount >= retryAttempts) {
      return
    }
    
    try {
      // Increment retry count
      retryHistory.value.set(retryKey, retryCount + 1)
      error.retryCount++
      
      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, retryCount)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Execute retry function
      await error.context.retryFn()
      
      // Mark error as resolved
      resolveError(errorId)
      
      
    } catch (retryError) {
      handleError(retryError, {
        ...error.context,
        action: 'retry',
        originalError: error.id
      })
    }
  }

  // Resolve error
  const resolveError = (errorId) => {
    const error = errors.value.find(e => e.id === errorId)
    if (error) {
      error.resolved = true
      error.resolvedAt = new Date()
      
      // Clear global error if resolved
      if (globalError.value && globalError.value.id === errorId) {
        globalError.value = null
      }
      
      updateErrorMetrics(error)
    }
  }

  // Clear errors
  const clearErrors = (filter = null) => {
    if (filter) {
      errors.value = errors.value.filter(error => !filter(error))
    } else {
      errors.value = []
      globalError.value = null
      errorCounts.value.clear()
      retryHistory.value.clear()
    }
  }

  // Persist error to local storage
  const persistError = (errorObj) => {
    try {
      const persistedErrors = JSON.parse(
        localStorage.getItem('d2-error-log') || '[]'
      )
      
      persistedErrors.push({
        ...errorObj,
        stack: errorObj.stack.substring(0, 500) // Limit stack size
      })
      
      // Keep only last 50 errors
      const limitedErrors = persistedErrors.slice(-50)
      
      localStorage.setItem('d2-error-log', JSON.stringify(limitedErrors))
    } catch (e) {
      console.warn('Failed to persist error:', e)
    }
  }

  // Load persisted errors
  const loadPersistedErrors = () => {
    try {
      const persistedErrors = JSON.parse(
        localStorage.getItem('d2-error-log') || '[]'
      )
      
      return persistedErrors.map(error => ({
        ...error,
        timestamp: new Date(error.timestamp),
        resolvedAt: error.resolvedAt ? new Date(error.resolvedAt) : null
      }))
    } catch (e) {
      console.warn('Failed to load persisted errors:', e)
      return []
    }
  }

  // Async error wrapper with automatic retry
  const wrapAsync = (asyncFn, context = {}) => {
    return async (...args) => {
      const { autoRetry = false, maxRetries = 3, retryDelay = 1000 } = context
      let lastError = null
      
      for (let attempt = 0; attempt <= (autoRetry ? maxRetries : 0); attempt++) {
        try {
          return await asyncFn(...args)
        } catch (error) {
          lastError = error
          
          // Handle error on first attempt or if retries are disabled
          if (attempt === 0 || !autoRetry) {
            handleError(error, {
              ...context,
              retryFn: () => asyncFn(...args),
              attempt: attempt + 1
            })
          }
          
          // If this is not the last attempt and auto-retry is enabled
          if (attempt < maxRetries && autoRetry) {
            console.log(`Retrying operation (attempt ${attempt + 2}/${maxRetries + 1})...`)
            const delay = retryDelay * Math.pow(2, attempt) // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          
          break
        }
      }
      
      throw lastError
    }
  }

  // Graceful degradation wrapper
  const withGracefulDegradation = (asyncFn, fallbackValue = null, context = {}) => {
    return async (...args) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        const errorObj = handleError(error, {
          ...context,
          degraded: true,
          fallbackUsed: true
        })
        
        // Log degradation
        console.warn(`Graceful degradation activated for ${context.operation || 'operation'}:`, error.message)
        
        // Return fallback value
        if (typeof fallbackValue === 'function') {
          return fallbackValue(error, ...args)
        }
        
        return fallbackValue
      }
    }
  }

  // Circuit breaker pattern for repeated failures
  const createCircuitBreaker = (asyncFn, options = {}) => {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 30000
    } = options

    let failureCount = 0
    let lastFailureTime = null
    let state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    let nextAttempt = Date.now()

    return async (...args) => {
      const now = Date.now()

      // Reset failure count after monitoring period
      if (lastFailureTime && (now - lastFailureTime) > monitoringPeriod && state === 'CLOSED') {
        failureCount = 0
      }

      // Circuit is OPEN - check if we should attempt reset
      if (state === 'OPEN') {
        if (now < nextAttempt) {
          throw new Error('Circuit breaker is OPEN - operation temporarily unavailable')
        }
        state = 'HALF_OPEN'
      }

      try {
        const result = await asyncFn(...args)
        
        // Success - reset circuit breaker
        if (state === 'HALF_OPEN') {
          state = 'CLOSED'
          failureCount = 0
        }
        
        return result
      } catch (error) {
        failureCount++
        lastFailureTime = now

        if (failureCount >= failureThreshold) {
          state = 'OPEN'
          nextAttempt = now + resetTimeout
          
          handleError(new Error(`Circuit breaker OPEN: ${failureCount} failures detected`), {
            component: 'circuit-breaker',
            originalError: error.message,
            action: 'circuit_open'
          })
        }

        throw error
      }
    }
  }

  // Component error boundary
  const createErrorBoundary = (component, fallbackComponent = null) => {
    const boundaryError = ref(null)
    
    onErrorCaptured((error, instance, info) => {
      boundaryError.value = handleError(error, {
        component: component || instance?.$options.name || 'Unknown',
        errorInfo: info,
        instance
      })
      
      // Return false to prevent error propagation
      return false
    })
    
    return {
      boundaryError,
      clearBoundaryError: () => { boundaryError.value = null }
    }
  }

  // Error recovery suggestions
  const getRecoverySuggestions = (errorObj) => {
    const suggestions = []
    
    switch (errorObj.type) {
      case ERROR_TYPES.NETWORK:
        suggestions.push('Check your internet connection')
        suggestions.push('Try refreshing the page')
        suggestions.push('Wait a moment and try again')
        break
      case ERROR_TYPES.DATA:
        suggestions.push('Verify the data format')
        suggestions.push('Check if all required fields are present')
        suggestions.push('Try loading different data')
        break
      case ERROR_TYPES.VISUALIZATION:
        suggestions.push('Try resizing the window')
        suggestions.push('Check if data is properly formatted')
        suggestions.push('Try switching to a different visualization')
        break
      case ERROR_TYPES.PERMISSION:
        suggestions.push('Check your access permissions')
        suggestions.push('Try logging in again')
        suggestions.push('Contact your administrator')
        break
      default:
        suggestions.push('Try refreshing the page')
        suggestions.push('Clear your browser cache')
        suggestions.push('Contact support if the problem persists')
    }
    
    return suggestions
  }

  // Initialize error handling
  const initializeErrorHandling = () => {
    // Global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        handleError(event.error || new Error(event.message), {
          component: 'global',
          action: 'unhandled_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      })
      
      window.addEventListener('unhandledrejection', (event) => {
        handleError(event.reason || new Error('Unhandled promise rejection'), {
          component: 'global',
          action: 'unhandled_rejection'
        })
      })
    }
  }

  return {
    // State
    errors,
    globalError,
    errorMetrics,
    
    // Computed
    hasErrors,
    hasGlobalError,
    criticalErrors,
    unresolvedErrors,
    
    // Error handling
    handleError,
    resolveError,
    clearErrors,
    
    // Retry mechanism
    retryOperation,
    
    // Utilities
    wrapAsync,
    withGracefulDegradation,
    createCircuitBreaker,
    createErrorBoundary,
    getRecoverySuggestions,
    showErrorDetails,
    
    // Persistence
    loadPersistedErrors,
    
    // Constants
    ERROR_TYPES,
    ERROR_SEVERITY,
    
    // Initialization
    initializeErrorHandling
  }
}