# Composition API Patterns

## Overview

This document provides comprehensive patterns and best practices for using Vue 3's Composition API in the D2 Nutrition Vibes application, with specific focus on data visualization, D3.js integration, and performance optimization.

## Table of Contents

1. [Basic Composable Patterns](#basic-composable-patterns)
2. [Data Management Patterns](#data-management-patterns)
3. [D3.js Integration Patterns](#d3js-integration-patterns)
4. [Performance Optimization Patterns](#performance-optimization-patterns)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Testing Patterns](#testing-patterns)
7. [Advanced Patterns](#advanced-patterns)

## Basic Composable Patterns

### 1. Simple State Composable

Basic pattern for encapsulating reactive state and related logic:

```typescript
// composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  
  const doubleCount = computed(() => count.value * 2)
  const isEven = computed(() => count.value % 2 === 0)
  
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initialValue
  
  return {
    // State
    count,
    // Computed
    doubleCount,
    isEven,
    // Actions
    increment,
    decrement,
    reset
  }
}
```

### 2. Configuration-Based Composable

Pattern for composables that accept configuration options:

```typescript
// composables/useToggle.ts
import { ref, Ref } from 'vue'

interface UseToggleOptions {
  initialValue?: boolean
  onToggle?: (value: boolean) => void
}

export function useToggle(options: UseToggleOptions = {}) {
  const { initialValue = false, onToggle } = options
  
  const isToggled = ref(initialValue)
  
  const toggle = () => {
    isToggled.value = !isToggled.value
    onToggle?.(isToggled.value)
  }
  
  const setToggle = (value: boolean) => {
    isToggled.value = value
    onToggle?.(value)
  }
  
  return {
    isToggled,
    toggle,
    setToggle
  }
}
```

### 3. Lifecycle-Aware Composable

Pattern for composables that need cleanup:

```typescript
// composables/useEventListener.ts
import { onMounted, onUnmounted, Ref } from 'vue'

export function useEventListener(
  target: Ref<EventTarget | null> | EventTarget,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
) {
  const cleanup = () => {
    const element = typeof target === 'object' && 'value' in target 
      ? target.value 
      : target
      
    if (element) {
      element.removeEventListener(event, handler, options)
    }
  }
  
  const setup = () => {
    const element = typeof target === 'object' && 'value' in target 
      ? target.value 
      : target
      
    if (element) {
      element.addEventListener(event, handler, options)
    }
  }
  
  onMounted(setup)
  onUnmounted(cleanup)
  
  return cleanup
}
```

## Data Management Patterns

### 1. Async Data Loading Pattern

```typescript
// composables/useAsyncData.ts
import { ref, computed, watchEffect } from 'vue'

interface UseAsyncDataOptions<T> {
  immediate?: boolean
  resetOnExecute?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useAsyncData<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
) {
  const {
    immediate = true,
    resetOnExecute = true,
    onSuccess,
    onError
  } = options
  
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const isLoading = ref(false)
  
  const isReady = computed(() => !isLoading.value && data.value !== null)
  const isError = computed(() => error.value !== null)
  
  const execute = async () => {
    if (resetOnExecute) {
      data.value = null
      error.value = null
    }
    
    isLoading.value = true
    
    try {
      const result = await asyncFn()
      data.value = result
      onSuccess?.(result)
    } catch (err) {
      error.value = err as Error
      onError?.(err as Error)
    } finally {
      isLoading.value = false
    }
  }
  
  if (immediate) {
    execute()
  }
  
  return {
    data,
    error,
    isLoading,
    isReady,
    isError,
    execute,
    refetch: execute
  }
}
```

### 2. Data Caching Pattern

```typescript
// composables/useCachedData.ts
import { ref, computed, watch } from 'vue'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 5 * 60 * 1000 // 5 minutes
) {
  const cache = new Map<string, CacheEntry<T>>()
  
  const data = ref<T | null>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  
  const isStale = computed(() => {
    const entry = cache.get(key)
    if (!entry) return true
    return Date.now() - entry.timestamp > entry.ttl
  })
  
  const loadData = async (forceRefresh = false) => {
    if (!forceRefresh && !isStale.value) {
      const entry = cache.get(key)
      if (entry) {
        data.value = entry.data
        return
      }
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      const result = await fetcher()
      const entry: CacheEntry<T> = {
        data: result,
        timestamp: Date.now(),
        ttl
      }
      
      cache.set(key, entry)
      data.value = result
    } catch (err) {
      error.value = err as Error
    } finally {
      isLoading.value = false
    }
  }
  
  const invalidate = () => {
    cache.delete(key)
  }
  
  return {
    data,
    isLoading,
    error,
    isStale,
    loadData,
    invalidate,
    refresh: () => loadData(true)
  }
}
```

### 3. Reactive Data Transformation Pattern

```typescript
// composables/useDataTransform.ts
import { ref, computed, watch, Ref } from 'vue'

interface TransformOptions<T, R> {
  immediate?: boolean
  debounce?: number
}

export function useDataTransform<T, R>(
  sourceData: Ref<T[]>,
  transformer: (data: T[]) => R[],
  options: TransformOptions<T, R> = {}
) {
  const { immediate = true, debounce = 0 } = options
  
  const transformedData = ref<R[]>([])
  const isTransforming = ref(false)
  const error = ref<Error | null>(null)
  
  let timeoutId: number | null = null
  
  const transform = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    const execute = () => {
      isTransforming.value = true
      error.value = null
      
      try {
        transformedData.value = transformer(sourceData.value)
      } catch (err) {
        error.value = err as Error
        transformedData.value = []
      } finally {
        isTransforming.value = false
      }
    }
    
    if (debounce > 0) {
      timeoutId = setTimeout(execute, debounce)
    } else {
      execute()
    }
  }
  
  watch(sourceData, transform, { immediate, deep: true })
  
  return {
    transformedData,
    isTransforming,
    error,
    transform
  }
}
```

## D3.js Integration Patterns

### 1. D3 Lifecycle Management Pattern

```typescript
// composables/useD3Lifecycle.ts
import { ref, onMounted, onUnmounted, watch, Ref } from 'vue'
import * as d3 from 'd3'

export function useD3Lifecycle(containerRef: Ref<HTMLElement | null>) {
  const svg = ref<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null)
  const isReady = ref(false)
  
  const dimensions = ref({ width: 0, height: 0 })
  let resizeObserver: ResizeObserver | null = null
  
  const updateDimensions = () => {
    if (!containerRef.value) return
    
    const rect = containerRef.value.getBoundingClientRect()
    dimensions.value = {
      width: rect.width,
      height: rect.height
    }
  }
  
  const initializeSVG = (options: { width?: number; height?: number } = {}) => {
    if (!containerRef.value) return null
    
    // Remove existing SVG
    d3.select(containerRef.value).select('svg').remove()
    
    const svgElement = d3.select(containerRef.value)
      .append('svg')
      .attr('width', options.width || dimensions.value.width)
      .attr('height', options.height || dimensions.value.height)
    
    svg.value = svgElement
    isReady.value = true
    
    return svgElement
  }
  
  const cleanup = () => {
    if (svg.value) {
      svg.value.remove()
      svg.value = null
    }
    
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    
    isReady.value = false
  }
  
  onMounted(() => {
    updateDimensions()
    
    // Setup resize observer
    if (containerRef.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(updateDimensions)
      resizeObserver.observe(containerRef.value)
    }
  })
  
  onUnmounted(cleanup)
  
  return {
    svg,
    dimensions,
    isReady,
    initializeSVG,
    updateDimensions,
    cleanup
  }
}
```

### 2. D3 Data Binding Pattern

```typescript
// composables/useD3DataBinding.ts
import { watch, Ref } from 'vue'
import * as d3 from 'd3'

interface D3DataBindingOptions<T> {
  keyFn?: (d: T) => string | number
  enterFn?: (selection: d3.Selection<d3.BaseType, T, SVGElement, unknown>) => void
  updateFn?: (selection: d3.Selection<d3.BaseType, T, SVGElement, unknown>) => void
  exitFn?: (selection: d3.Selection<d3.BaseType, T, SVGElement, unknown>) => void
}

export function useD3DataBinding<T>(
  svg: Ref<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>,
  data: Ref<T[]>,
  selector: string,
  options: D3DataBindingOptions<T> = {}
) {
  const {
    keyFn,
    enterFn,
    updateFn,
    exitFn
  } = options
  
  const update = () => {
    if (!svg.value) return
    
    const selection = svg.value
      .selectAll(selector)
      .data(data.value, keyFn)
    
    // Handle entering elements
    const enter = selection.enter()
    if (enterFn) {
      enterFn(enter)
    }
    
    // Handle updating elements
    const update = selection.merge(enter as any)
    if (updateFn) {
      updateFn(update)
    }
    
    // Handle exiting elements
    const exit = selection.exit()
    if (exitFn) {
      exitFn(exit)
    } else {
      exit.remove()
    }
  }
  
  watch([svg, data], update, { immediate: true, deep: true })
  
  return {
    update
  }
}
```

### 3. D3 Animation Pattern

```typescript
// composables/useD3Animation.ts
import { ref } from 'vue'
import * as d3 from 'd3'

interface AnimationOptions {
  duration?: number
  ease?: (t: number) => number
  delay?: number
}

export function useD3Animation() {
  const isAnimating = ref(false)
  const animationProgress = ref(0)
  
  const animate = <T extends d3.BaseType>(
    selection: d3.Selection<T, any, any, any>,
    options: AnimationOptions = {}
  ) => {
    const {
      duration = 750,
      ease = d3.easeQuadInOut,
      delay = 0
    } = options
    
    isAnimating.value = true
    animationProgress.value = 0
    
    return selection
      .transition()
      .duration(duration)
      .ease(ease)
      .delay(delay)
      .tween('progress', () => {
        const interpolate = d3.interpolate(0, 1)
        return (t: number) => {
          animationProgress.value = interpolate(t)
        }
      })
      .on('end', () => {
        isAnimating.value = false
        animationProgress.value = 1
      })
  }
  
  const staggeredAnimate = <T extends d3.BaseType>(
    selection: d3.Selection<T, any, any, any>,
    options: AnimationOptions & { staggerDelay?: number } = {}
  ) => {
    const { staggerDelay = 50, ...animationOptions } = options
    
    return selection
      .transition()
      .delay((d, i) => i * staggerDelay + (animationOptions.delay || 0))
      .duration(animationOptions.duration || 750)
      .ease(animationOptions.ease || d3.easeQuadInOut)
  }
  
  return {
    isAnimating,
    animationProgress,
    animate,
    staggeredAnimate
  }
}
```

## Performance Optimization Patterns

### 1. Debounced Reactive Pattern

```typescript
// composables/useDebounced.ts
import { ref, watch, Ref } from 'vue'

export function useDebounced<T>(
  source: Ref<T>,
  delay = 300
) {
  const debouncedValue = ref<T>(source.value)
  let timeoutId: number | null = null
  
  watch(source, (newValue) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      debouncedValue.value = newValue
    }, delay)
  })
  
  return debouncedValue
}
```

### 2. Virtual Scrolling Pattern

```typescript
// composables/useVirtualScroll.ts
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  buffer?: number
}

export function useVirtualScroll<T>(
  items: Ref<T[]>,
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, buffer = 5 } = options
  
  const scrollTop = ref(0)
  const containerRef = ref<HTMLElement | null>(null)
  
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight)
  const totalHeight = computed(() => items.value.length * itemHeight)
  
  const startIndex = computed(() => {
    const index = Math.floor(scrollTop.value / itemHeight)
    return Math.max(0, index - buffer)
  })
  
  const endIndex = computed(() => {
    return Math.min(
      items.value.length - 1,
      startIndex.value + visibleItemsCount + buffer * 2
    )
  })
  
  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value + 1)
  })
  
  const offsetY = computed(() => startIndex.value * itemHeight)
  
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }
  
  onMounted(() => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll)
    }
  })
  
  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
  })
  
  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex
  }
}
```

### 3. Memoization Pattern

```typescript
// composables/useMemoization.ts
import { ref, computed, watch, Ref } from 'vue'

interface MemoOptions<T, R> {
  keyFn?: (input: T) => string
  maxSize?: number
}

export function useMemoization<T, R>(
  computeFn: (input: T) => R,
  options: MemoOptions<T, R> = {}
) {
  const { keyFn = JSON.stringify, maxSize = 100 } = options
  
  const cache = new Map<string, R>()
  const hitCount = ref(0)
  const missCount = ref(0)
  
  const compute = (input: T): R => {
    const key = keyFn(input)
    
    if (cache.has(key)) {
      hitCount.value++
      return cache.get(key)!
    }
    
    missCount.value++
    const result = computeFn(input)
    
    // Implement LRU eviction if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    
    cache.set(key, result)
    return result
  }
  
  const clear = () => {
    cache.clear()
    hitCount.value = 0
    missCount.value = 0
  }
  
  const stats = computed(() => ({
    size: cache.size,
    hitRate: hitCount.value / (hitCount.value + missCount.value) || 0,
    hits: hitCount.value,
    misses: missCount.value
  }))
  
  return {
    compute,
    clear,
    stats
  }
}
```

## Error Handling Patterns

### 1. Error Boundary Pattern

```typescript
// composables/useErrorBoundary.ts
import { ref, onErrorCaptured } from 'vue'

interface ErrorInfo {
  error: Error
  info: string
  timestamp: Date
}

export function useErrorBoundary() {
  const errors = ref<ErrorInfo[]>([])
  const hasError = computed(() => errors.value.length > 0)
  
  onErrorCaptured((error, instance, info) => {
    const errorInfo: ErrorInfo = {
      error,
      info,
      timestamp: new Date()
    }
    
    errors.value.push(errorInfo)
    
    // Log to external service
    console.error('Component error caught:', errorInfo)
    
    // Prevent error from propagating
    return false
  })
  
  const clearErrors = () => {
    errors.value = []
  }
  
  const clearError = (index: number) => {
    errors.value.splice(index, 1)
  }
  
  return {
    errors,
    hasError,
    clearErrors,
    clearError
  }
}
```

### 2. Retry Logic Pattern

```typescript
// composables/useRetry.ts
import { ref } from 'vue'

interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoff?: boolean
  onRetry?: (attempt: number, error: Error) => void
}

export function useRetry<T>(
  asyncFn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options
  
  const attempts = ref(0)
  const isRetrying = ref(false)
  const lastError = ref<Error | null>(null)
  
  const execute = async (): Promise<T> => {
    attempts.value = 0
    lastError.value = null
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attempts.value = attempt
      
      try {
        const result = await asyncFn()
        isRetrying.value = false
        return result
      } catch (error) {
        lastError.value = error as Error
        
        if (attempt < maxAttempts) {
          isRetrying.value = true
          onRetry?.(attempt, error as Error)
          
          const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
          await new Promise(resolve => setTimeout(resolve, waitTime))
        } else {
          isRetrying.value = false
          throw error
        }
      }
    }
    
    throw lastError.value
  }
  
  return {
    execute,
    attempts,
    isRetrying,
    lastError
  }
}
```

## Testing Patterns

### 1. Composable Testing Pattern

```typescript
// tests/composables/useCounter.test.ts
import { useCounter } from '@/composables/useCounter'

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { count, doubleCount, isEven } = useCounter()
    
    expect(count.value).toBe(0)
    expect(doubleCount.value).toBe(0)
    expect(isEven.value).toBe(true)
  })
  
  it('should initialize with custom value', () => {
    const { count } = useCounter(5)
    
    expect(count.value).toBe(5)
  })
  
  it('should increment correctly', () => {
    const { count, increment } = useCounter()
    
    increment()
    expect(count.value).toBe(1)
  })
  
  it('should handle reactive computations', () => {
    const { count, doubleCount, increment } = useCounter()
    
    increment()
    increment()
    
    expect(count.value).toBe(2)
    expect(doubleCount.value).toBe(4)
  })
})
```

### 2. Mock Dependencies Pattern

```typescript
// tests/composables/useAsyncData.test.ts
import { useAsyncData } from '@/composables/useAsyncData'
import { vi } from 'vitest'

describe('useAsyncData', () => {
  it('should handle successful data loading', async () => {
    const mockFn = vi.fn().mockResolvedValue('test data')
    const { data, isLoading, execute } = useAsyncData(mockFn, { immediate: false })
    
    expect(isLoading.value).toBe(false)
    
    const promise = execute()
    expect(isLoading.value).toBe(true)
    
    await promise
    
    expect(isLoading.value).toBe(false)
    expect(data.value).toBe('test data')
  })
  
  it('should handle errors', async () => {
    const error = new Error('Test error')
    const mockFn = vi.fn().mockRejectedValue(error)
    const { error: errorRef, execute } = useAsyncData(mockFn, { immediate: false })
    
    await execute()
    
    expect(errorRef.value).toBe(error)
  })
})
```

## Advanced Patterns

### 1. Composable Composition Pattern

```typescript
// composables/useDataVisualization.ts
import { useAsyncData } from './useAsyncData'
import { useD3Lifecycle } from './useD3Lifecycle'
import { useDataTransform } from './useDataTransform'
import { useMemoization } from './useMemoization'

export function useDataVisualization(
  containerRef: Ref<HTMLElement | null>,
  dataFetcher: () => Promise<RawData[]>
) {
  // Compose multiple composables
  const { data: rawData, isLoading, execute: loadData } = useAsyncData(dataFetcher)
  const { svg, dimensions, initializeSVG } = useD3Lifecycle(containerRef)
  
  // Memoize expensive transformations
  const { compute: transformData } = useMemoization(
    (data: RawData[]) => processVisualizationData(data)
  )
  
  const { transformedData } = useDataTransform(
    rawData,
    transformData,
    { debounce: 300 }
  )
  
  // Combined state and actions
  const isReady = computed(() => 
    !isLoading.value && svg.value !== null && transformedData.value.length > 0
  )
  
  const render = () => {
    if (!isReady.value) return
    
    // D3 rendering logic
    renderVisualization(svg.value!, transformedData.value, dimensions.value)
  }
  
  watch([isReady], render)
  
  return {
    // State
    rawData,
    transformedData,
    isLoading,
    isReady,
    dimensions,
    
    // Actions
    loadData,
    render,
    initializeSVG
  }
}
```

### 2. Plugin Pattern

```typescript
// composables/createComposablePlugin.ts
interface ComposablePlugin<T> {
  name: string
  setup: (context: T) => any
  cleanup?: () => void
}

export function createComposablePlugin<T>() {
  const plugins = ref<ComposablePlugin<T>[]>([])
  
  const use = (plugin: ComposablePlugin<T>) => {
    plugins.value.push(plugin)
  }
  
  const setupPlugins = (context: T) => {
    const pluginResults = new Map()
    
    plugins.value.forEach(plugin => {
      const result = plugin.setup(context)
      pluginResults.set(plugin.name, result)
    })
    
    return pluginResults
  }
  
  const cleanupPlugins = () => {
    plugins.value.forEach(plugin => {
      plugin.cleanup?.()
    })
  }
  
  return {
    use,
    setupPlugins,
    cleanupPlugins
  }
}
```

These patterns provide a comprehensive foundation for building maintainable, performant, and testable Vue 3 applications using the Composition API, with specific focus on data visualization and D3.js integration scenarios.