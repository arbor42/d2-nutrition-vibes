import { ref, computed } from 'vue'

/**
 * Advanced caching system for D3.js computations
 * Provides intelligent caching with TTL, size limits, and cache warming
 */
export function useD3Cache(options = {}) {
  const {
    maxSize = 1000,
    defaultTTL = 5 * 60 * 1000, // 5 minutes
    cleanupInterval = 60 * 1000, // 1 minute
    enableMetrics = true
  } = options

  // Cache storage
  const cache = ref(new Map())
  const metrics = ref({
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    memoryUsage: 0
  })

  let cleanupTimer = null

  /**
   * Cache entry structure
   */
  const createCacheEntry = (value, ttl = defaultTTL) => ({
    value,
    timestamp: Date.now(),
    ttl,
    accessCount: 0,
    lastAccessed: Date.now(),
    size: estimateSize(value)
  })

  /**
   * Estimate memory size of a value
   */
  const estimateSize = (value) => {
    try {
      return JSON.stringify(value).length * 2 // Rough estimate in bytes
    } catch {
      return 1000 // Default size for non-serializable objects
    }
  }

  /**
   * Generate cache key from function and arguments
   */
  const generateKey = (fn, args = []) => {
    const fnString = fn.toString()
    const argsString = JSON.stringify(args)
    return `${fnString.substring(0, 50)}_${argsString}`
  }

  /**
   * Check if cache entry is expired
   */
  const isExpired = (entry) => {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Get value from cache
   */
  const get = (key) => {
    const entry = cache.value.get(key)
    
    if (!entry) {
      if (enableMetrics) metrics.value.misses++
      return null
    }

    if (isExpired(entry)) {
      cache.value.delete(key)
      if (enableMetrics) {
        metrics.value.misses++
        metrics.value.size--
        metrics.value.memoryUsage -= entry.size
      }
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()
    
    if (enableMetrics) metrics.value.hits++
    return entry.value
  }

  /**
   * Set value in cache
   */
  const set = (key, value, ttl = defaultTTL) => {
    // Check if we need to evict entries
    if (cache.value.size >= maxSize) {
      evictLRU()
    }

    const entry = createCacheEntry(value, ttl)
    cache.value.set(key, entry)

    if (enableMetrics) {
      metrics.value.size++
      metrics.value.memoryUsage += entry.size
    }
  }

  /**
   * Evict least recently used entry
   */
  const evictLRU = () => {
    let lruKey = null
    let lruTime = Date.now()

    cache.value.forEach((entry, key) => {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed
        lruKey = key
      }
    })

    if (lruKey) {
      const entry = cache.value.get(lruKey)
      cache.value.delete(lruKey)
      
      if (enableMetrics) {
        metrics.value.evictions++
        metrics.value.size--
        metrics.value.memoryUsage -= entry.size
      }
    }
  }

  /**
   * Clear expired entries
   */
  const clearExpired = () => {
    const now = Date.now()
    const expiredKeys = []

    cache.value.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach(key => {
      const entry = cache.value.get(key)
      cache.value.delete(key)
      
      if (enableMetrics) {
        metrics.value.size--
        metrics.value.memoryUsage -= entry.size
      }
    })

    return expiredKeys.length
  }

  /**
   * Memoize a function with caching
   */
  const memoize = (fn, options = {}) => {
    const {
      keyGenerator = generateKey,
      ttl = defaultTTL,
      warmup = null
    } = options

    const memoizedFn = (...args) => {
      const key = keyGenerator(fn, args)
      
      // Try to get from cache
      const cached = get(key)
      if (cached !== null) {
        return cached
      }

      // Compute new value
      const result = fn(...args)
      
      // Store in cache
      set(key, result, ttl)
      
      return result
    }

    // Warmup cache if provided
    if (warmup && Array.isArray(warmup)) {
      warmup.forEach(args => {
        memoizedFn(...args)
      })
    }

    return memoizedFn
  }

  /**
   * Memoize async function
   */
  const memoizeAsync = (fn, options = {}) => {
    const {
      keyGenerator = generateKey,
      ttl = defaultTTL
    } = options

    return async (...args) => {
      const key = keyGenerator(fn, args)
      
      // Try to get from cache
      const cached = get(key)
      if (cached !== null) {
        return cached
      }

      try {
        // Compute new value
        const result = await fn(...args)
        
        // Store in cache
        set(key, result, ttl)
        
        return result
      } catch (error) {
        // Don't cache errors
        throw error
      }
    }
  }

  /**
   * Cache D3 scale computations
   */
  const cacheScale = (scaleFactory, domain, range, options = {}) => {
    const key = `scale_${JSON.stringify({ domain, range, options })}`
    
    const cached = get(key)
    if (cached) return cached

    const scale = scaleFactory()
      .domain(domain)
      .range(range)

    // Apply additional options
    Object.entries(options).forEach(([method, value]) => {
      if (typeof scale[method] === 'function') {
        scale[method](value)
      }
    })

    set(key, scale)
    return scale
  }

  /**
   * Cache data transformations
   */
  const cacheTransform = (data, transformFn, options = {}) => {
    const {
      ttl = defaultTTL,
      keyPrefix = 'transform'
    } = options

    const dataHash = JSON.stringify(data).substring(0, 100)
    const fnHash = transformFn.toString().substring(0, 100)
    const key = `${keyPrefix}_${dataHash}_${fnHash}`

    const cached = get(key)
    if (cached) return cached

    const result = transformFn(data)
    set(key, result, ttl)
    return result
  }

  /**
   * Cache expensive D3 computations
   */
  const cacheComputation = (computationName, inputs, computeFn, ttl = defaultTTL) => {
    const key = `${computationName}_${JSON.stringify(inputs)}`
    
    const cached = get(key)
    if (cached) return cached

    const result = computeFn(inputs)
    set(key, result, ttl)
    return result
  }

  /**
   * Preload common computations
   */
  const preload = (preloadConfig) => {
    return Promise.all(
      preloadConfig.map(async ({ key, computeFn, ttl }) => {
        try {
          const result = await computeFn()
          set(key, result, ttl)
          return { key, success: true }
        } catch (error) {
          console.warn(`Failed to preload cache key ${key}:`, error)
          return { key, success: false, error }
        }
      })
    )
  }

  /**
   * Get cache statistics
   */
  const getStats = () => {
    return {
      ...metrics.value,
      hitRate: metrics.value.hits / (metrics.value.hits + metrics.value.misses) || 0,
      memoryUsageMB: (metrics.value.memoryUsage / (1024 * 1024)).toFixed(2)
    }
  }

  /**
   * Clear entire cache
   */
  const clear = () => {
    cache.value.clear()
    if (enableMetrics) {
      metrics.value = {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        memoryUsage: 0
      }
    }
  }

  /**
   * Export cache for debugging
   */
  const exportCache = () => {
    const entries = {}
    cache.value.forEach((entry, key) => {
      entries[key] = {
        ...entry,
        age: Date.now() - entry.timestamp,
        expired: isExpired(entry)
      }
    })
    return entries
  }

  /**
   * Bulk operations
   */
  const bulkSet = (entries) => {
    entries.forEach(({ key, value, ttl }) => {
      set(key, value, ttl)
    })
  }

  const bulkGet = (keys) => {
    return keys.map(key => ({ key, value: get(key) }))
  }

  const bulkDelete = (keys) => {
    keys.forEach(key => {
      const entry = cache.value.get(key)
      if (entry) {
        cache.value.delete(key)
        if (enableMetrics) {
          metrics.value.size--
          metrics.value.memoryUsage -= entry.size
        }
      }
    })
  }

  // Setup cleanup timer
  if (cleanupInterval > 0) {
    cleanupTimer = setInterval(() => {
      const cleared = clearExpired()
      if (cleared > 0) {
        console.log(`Cache cleanup: removed ${cleared} expired entries`)
      }
    }, cleanupInterval)
  }

  // Computed values for reactive access
  const hitRate = computed(() => {
    const total = metrics.value.hits + metrics.value.misses
    return total > 0 ? (metrics.value.hits / total) : 0
  })

  const memoryUsageMB = computed(() => {
    return (metrics.value.memoryUsage / (1024 * 1024)).toFixed(2)
  })

  // Cleanup function
  const cleanup = () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
    }
    clear()
  }

  return {
    // Core cache operations
    get,
    set,
    clear,
    clearExpired,
    
    // Memoization
    memoize,
    memoizeAsync,
    
    // Specialized D3 caching
    cacheScale,
    cacheTransform,
    cacheComputation,
    
    // Bulk operations
    bulkSet,
    bulkGet,
    bulkDelete,
    
    // Cache management
    preload,
    evictLRU,
    exportCache,
    cleanup,
    
    // Statistics
    getStats,
    hitRate,
    memoryUsageMB,
    metrics: metrics.value,
    
    // Cache state
    size: computed(() => cache.value.size)
  }
}

/**
 * Global cache instance for D3 computations
 */
export const globalD3Cache = useD3Cache({
  maxSize: 2000,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 2 * 60 * 1000 // 2 minutes
})

/**
 * Decorator for caching D3 function results
 */
export function cacheD3Function(ttl = 5 * 60 * 1000) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = function(...args) {
      const cache = this.d3Cache || globalD3Cache
      const key = `${propertyKey}_${JSON.stringify(args)}`
      
      const cached = cache.get(key)
      if (cached !== null) {
        return cached
      }
      
      const result = originalMethod.apply(this, args)
      cache.set(key, result, ttl)
      
      return result
    }
    
    return descriptor
  }
}

/**
 * Vue composable for component-specific D3 caching
 */
export function useComponentD3Cache(componentName, options = {}) {
  const cache = useD3Cache({
    maxSize: 100,
    defaultTTL: 5 * 60 * 1000,
    ...options
  })

  // Add component name to cache keys
  const componentGet = (key) => cache.get(`${componentName}_${key}`)
  const componentSet = (key, value, ttl) => cache.set(`${componentName}_${key}`, value, ttl)
  
  return {
    ...cache,
    get: componentGet,
    set: componentSet
  }
}