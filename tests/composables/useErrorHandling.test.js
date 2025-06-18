import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useErrorHandling } from '@/composables/useErrorHandling'

describe('useErrorHandling', () => {
  let consoleErrorSpy
  
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('handleError', () => {
    it('should log errors to console', () => {
      const { handleError } = useErrorHandling()
      const error = new Error('Test error')
      
      handleError(error)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred:', error)
    })

    it('should include context information', () => {
      const { handleError } = useErrorHandling()
      const error = new Error('Test error')
      const context = { component: 'TestComponent', action: 'testAction' }
      
      handleError(error, context)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred:', error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Context:', context)
    })
  })

  describe('wrapAsync', () => {
    it('should execute async function successfully', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn().mockResolvedValue('success')
      
      const wrappedFn = wrapAsync(mockFn)
      const result = await wrappedFn()
      
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalled()
    })

    it('should catch and handle errors', async () => {
      const { wrapAsync } = useErrorHandling()
      const error = new Error('Async error')
      const mockFn = vi.fn().mockRejectedValue(error)
      
      const wrappedFn = wrapAsync(mockFn)
      
      await expect(wrappedFn()).rejects.toThrow('Async error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred:', error)
    })

    it('should retry on failure when autoRetry is enabled', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success')
      
      const wrappedFn = wrapAsync(mockFn, {
        autoRetry: true,
        maxRetries: 3,
        retryDelay: 10
      })
      
      const result = await wrappedFn()
      
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn().mockRejectedValue(new Error('Persistent error'))
      
      const wrappedFn = wrapAsync(mockFn, {
        autoRetry: true,
        maxRetries: 2,
        retryDelay: 10
      })
      
      await expect(wrappedFn()).rejects.toThrow('Persistent error')
      expect(mockFn).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should implement exponential backoff', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success')
      
      const startTime = Date.now()
      
      const wrappedFn = wrapAsync(mockFn, {
        autoRetry: true,
        maxRetries: 2,
        retryDelay: 100
      })
      
      await wrappedFn()
      
      const elapsed = Date.now() - startTime
      expect(elapsed).toBeGreaterThan(90) // Should have waited at least 100ms
    })
  })

  describe('circuit breaker', () => {
    it('should implement circuit breaker pattern', async () => {
      const { wrapAsync, circuitBreaker } = useErrorHandling()
      const mockFn = vi.fn().mockRejectedValue(new Error('Service unavailable'))
      
      const wrappedFn = wrapAsync(mockFn, {
        circuitBreaker: true,
        failureThreshold: 2,
        resetTimeout: 1000
      })
      
      // First few calls should fail and increment failure count
      await expect(wrappedFn()).rejects.toThrow()
      await expect(wrappedFn()).rejects.toThrow()
      
      // Circuit should now be open, rejecting immediately
      await expect(wrappedFn()).rejects.toThrow('Circuit breaker is open')
      
      expect(mockFn).toHaveBeenCalledTimes(2) // Should not call the actual function when circuit is open
    })

    it('should reset circuit breaker after timeout', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValueOnce('success after reset')
      
      const wrappedFn = wrapAsync(mockFn, {
        circuitBreaker: true,
        failureThreshold: 2,
        resetTimeout: 50
      })
      
      // Trigger circuit breaker
      await expect(wrappedFn()).rejects.toThrow()
      await expect(wrappedFn()).rejects.toThrow()
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 60))
      
      // Should work again after reset
      const result = await wrappedFn()
      expect(result).toBe('success after reset')
    })
  })

  describe('graceful degradation', () => {
    it('should provide fallback data on error', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn().mockRejectedValue(new Error('API failure'))
      const fallbackData = { message: 'Fallback data' }
      
      const wrappedFn = wrapAsync(mockFn, {
        fallbackData,
        gracefulDegradation: true
      })
      
      const result = await wrappedFn()
      
      expect(result).toEqual(fallbackData)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should use fallback function when provided', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn().mockRejectedValue(new Error('API failure'))
      const fallbackFn = vi.fn().mockResolvedValue({ message: 'Fallback result' })
      
      const wrappedFn = wrapAsync(mockFn, {
        fallbackFn,
        gracefulDegradation: true
      })
      
      const result = await wrappedFn()
      
      expect(result).toEqual({ message: 'Fallback result' })
      expect(fallbackFn).toHaveBeenCalled()
    })
  })

  describe('performance monitoring', () => {
    it('should track execution time', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('done'), 100))
      )
      
      const wrappedFn = wrapAsync(mockFn, {
        trackPerformance: true
      })
      
      const result = await wrappedFn()
      
      expect(result).toBe('done')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance'),
        expect.any(Object)
      )
    })

    it('should warn on slow operations', async () => {
      const { wrapAsync } = useErrorHandling()
      const mockFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('done'), 200))
      )
      
      const wrappedFn = wrapAsync(mockFn, {
        trackPerformance: true,
        slowThreshold: 100
      })
      
      await wrappedFn()
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected'),
        expect.any(Object)
      )
    })
  })
})