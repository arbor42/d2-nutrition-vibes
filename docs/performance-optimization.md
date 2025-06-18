# Performance Optimization Guide

## Overview

This guide provides comprehensive strategies and techniques for optimizing the performance of the D2 Nutrition Vibes application, focusing on large dataset handling, visualization performance, and user experience optimization.

## Table of Contents

1. [Performance Metrics](#performance-metrics)
2. [Bundle Optimization](#bundle-optimization)
3. [Runtime Performance](#runtime-performance)
4. [Data Handling Optimization](#data-handling-optimization)
5. [D3.js Visualization Performance](#d3js-visualization-performance)
6. [Memory Management](#memory-management)
7. [Network Optimization](#network-optimization)
8. [Mobile Performance](#mobile-performance)
9. [Monitoring and Profiling](#monitoring-and-profiling)

## Performance Metrics

### Core Web Vitals

Monitor these key metrics for optimal user experience:

```javascript
// utils/performanceMonitoring.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export function initPerformanceMonitoring() {
  // Cumulative Layout Shift
  getCLS((metric) => {
    console.log('CLS:', metric.value)
    sendToAnalytics('CLS', metric)
  })

  // First Input Delay
  getFID((metric) => {
    console.log('FID:', metric.value)
    sendToAnalytics('FID', metric)
  })

  // First Contentful Paint
  getFCP((metric) => {
    console.log('FCP:', metric.value)
    sendToAnalytics('FCP', metric)
  })

  // Largest Contentful Paint
  getLCP((metric) => {
    console.log('LCP:', metric.value)
    sendToAnalytics('LCP', metric)
  })

  // Time to First Byte
  getTTFB((metric) => {
    console.log('TTFB:', metric.value)
    sendToAnalytics('TTFB', metric)
  })
}

function sendToAnalytics(name, metric) {
  // Send to your analytics service
  if (window.gtag) {
    gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      event_label: metric.id
    })
  }
}
```

### Custom Performance Metrics

```javascript
// composables/usePerformanceTracking.js
export function usePerformanceTracking() {
  const trackDataLoading = (datasetName, callback) => {
    const startTime = performance.now()
    
    return callback().finally(() => {
      const duration = performance.now() - startTime
      console.log(`${datasetName} loaded in ${duration.toFixed(2)}ms`)
      
      // Track in analytics
      if (window.gtag) {
        gtag('event', 'data_load_time', {
          event_category: 'Performance',
          value: Math.round(duration),
          event_label: datasetName
        })
      }
    })
  }

  const trackVisualizationRender = (chartType, callback) => {
    const startTime = performance.now()
    
    return callback().finally(() => {
      const duration = performance.now() - startTime
      console.log(`${chartType} rendered in ${duration.toFixed(2)}ms`)
    })
  }

  return {
    trackDataLoading,
    trackVisualizationRender
  }
}
```

## Bundle Optimization

### Code Splitting

```javascript
// router/index.js - Route-based code splitting
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/timeseries',
    component: () => import('@/views/TimeseriesView.vue')
  },
  {
    path: '/simulation',
    component: () => import('@/views/SimulationView.vue')
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

### Dynamic Imports for Heavy Components

```vue
<!-- components/LazyChart.vue -->
<template>
  <div>
    <div v-if="!chartComponent" class="loading">
      Loading chart...
    </div>
    <component v-else :is="chartComponent" v-bind="$attrs" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  chartType: {
    type: String,
    required: true
  }
})

const chartComponent = ref(null)

onMounted(async () => {
  try {
    const module = await import(`@/components/visualizations/${props.chartType}.vue`)
    chartComponent.value = module.default
  } catch (error) {
    console.error(`Failed to load chart: ${props.chartType}`, error)
  }
})
</script>
```

### Bundle Analysis and Optimization

```javascript
// vite.config.js - Bundle optimization
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    // Bundle analyzer
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true
    })
  ],
  
  build: {
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'd3-vendor': ['d3', 'topojson-client'],
          'utils-vendor': ['lodash-es', 'date-fns'],
          
          // Feature-based chunks
          'data-processing': [
            './src/services/dataService.js',
            './src/utils/dataProcessing.js'
          ]
        }
      }
    },
    
    // Compression settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096, // 4kb
    cssCodeSplit: true
  }
})
```

## Runtime Performance

### Vue.js Performance Optimization

```vue
<!-- Optimize large lists with v-memo -->
<template>
  <div>
    <div 
      v-for="item in largeDataset" 
      :key="item.id"
      v-memo="[item.id, item.updatedAt]"
      class="data-item"
    >
      <ExpensiveComponent :data="item" />
    </div>
  </div>
</template>

<script setup>
import { computed, shallowRef } from 'vue'

// Use shallowRef for large objects that don't need deep reactivity
const largeDataset = shallowRef([])

// Computed properties for expensive calculations
const processedData = computed(() => {
  return expensiveCalculation(largeDataset.value)
})
</script>
```

### Debounced Updates

```javascript
// composables/useDebounced.js
import { ref, watch } from 'vue'
import { debounce } from 'lodash-es'

export function useDebouncedUpdate(callback, delay = 300) {
  const isUpdating = ref(false)
  
  const debouncedCallback = debounce(async (...args) => {
    isUpdating.value = true
    try {
      await callback(...args)
    } finally {
      isUpdating.value = false
    }
  }, delay)
  
  return {
    isUpdating,
    debouncedCallback
  }
}

// Usage in components
const { isUpdating, debouncedCallback } = useDebouncedUpdate(
  (searchTerm) => searchData(searchTerm),
  500
)

watch(searchTerm, debouncedCallback)
```

### Virtual Scrolling Implementation

```vue
<!-- components/VirtualScroller.vue -->
<template>
  <div 
    ref="containerRef"
    class="virtual-scroller"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div 
        :style="{ 
          transform: `translateY(${offsetY}px)`,
          position: 'absolute',
          width: '100%'
        }"
      >
        <div
          v-for="item in visibleItems"
          :key="item.id"
          :style="{ height: itemHeight + 'px' }"
          class="virtual-item"
        >
          <slot :item="item" :index="item.index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  items: Array,
  itemHeight: { type: Number, default: 50 },
  containerHeight: { type: Number, default: 400 },
  buffer: { type: Number, default: 5 }
})

const containerRef = ref(null)
const scrollTop = ref(0)

const visibleItemsCount = Math.ceil(props.containerHeight / props.itemHeight)
const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight)
  return Math.max(0, index - props.buffer)
})

const endIndex = computed(() => {
  return Math.min(
    props.items.length - 1,
    startIndex.value + visibleItemsCount + props.buffer * 2
  )
})

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value + 1)
    .map((item, index) => ({
      ...item,
      index: startIndex.value + index
    }))
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

const handleScroll = (event) => {
  scrollTop.value = event.target.scrollTop
}
</script>
```

## Data Handling Optimization

### Efficient Data Structures

```javascript
// utils/dataStructures.js
export class DataCache {
  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.accessOrder = new Map()
  }

  get(key) {
    if (this.cache.has(key)) {
      // Update access order for LRU
      this.accessOrder.set(key, Date.now())
      return this.cache.get(key)
    }
    return null
  }

  set(key, value) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, value)
    this.accessOrder.set(key, Date.now())
  }

  evictLRU() {
    let oldestKey = null
    let oldestTime = Date.now()

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.accessOrder.delete(oldestKey)
    }
  }
}

// Optimized data processing
export function processLargeDataset(data, batchSize = 1000) {
  return new Promise((resolve) => {
    const results = []
    let index = 0

    function processBatch() {
      const endIndex = Math.min(index + batchSize, data.length)
      
      for (let i = index; i < endIndex; i++) {
        results.push(expensiveOperation(data[i]))
      }

      index = endIndex

      if (index < data.length) {
        // Use requestIdleCallback for non-blocking processing
        if (window.requestIdleCallback) {
          requestIdleCallback(processBatch)
        } else {
          setTimeout(processBatch, 0)
        }
      } else {
        resolve(results)
      }
    }

    processBatch()
  })
}
```

### Web Workers for Heavy Processing

```javascript
// workers/dataProcessor.js
self.onmessage = function(event) {
  const { type, data, options } = event.data

  switch (type) {
    case 'PROCESS_TIMESERIES':
      const result = processTimeseriesData(data, options)
      self.postMessage({ type: 'TIMESERIES_RESULT', result })
      break

    case 'CALCULATE_STATISTICS':
      const stats = calculateStatistics(data)
      self.postMessage({ type: 'STATISTICS_RESULT', result: stats })
      break

    default:
      self.postMessage({ type: 'ERROR', message: 'Unknown operation' })
  }
}

function processTimeseriesData(data, options) {
  // Heavy computation logic
  return data.map(item => ({
    ...item,
    processed: expensiveCalculation(item, options)
  }))
}

// composables/useWebWorker.js
export function useWebWorker(workerPath) {
  const worker = ref(null)
  const isProcessing = ref(false)
  const error = ref(null)

  onMounted(() => {
    worker.value = new Worker(workerPath)
    
    worker.value.onerror = (err) => {
      error.value = err
      isProcessing.value = false
    }
  })

  onUnmounted(() => {
    if (worker.value) {
      worker.value.terminate()
    }
  })

  const processData = (type, data, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!worker.value) {
        reject(new Error('Worker not initialized'))
        return
      }

      isProcessing.value = true
      error.value = null

      const handleMessage = (event) => {
        const { type: responseType, result, message } = event.data
        
        if (responseType === 'ERROR') {
          reject(new Error(message))
        } else {
          resolve(result)
        }
        
        isProcessing.value = false
        worker.value.removeEventListener('message', handleMessage)
      }

      worker.value.addEventListener('message', handleMessage)
      worker.value.postMessage({ type, data, options })
    })
  }

  return {
    processData,
    isProcessing,
    error
  }
}
```

## D3.js Visualization Performance

### Canvas Rendering for Large Datasets

```javascript
// composables/useCanvasChart.js
export function useCanvasChart(containerRef) {
  const canvasRef = ref(null)
  const context = ref(null)
  const dimensions = ref({ width: 0, height: 0 })

  const setupCanvas = () => {
    if (!containerRef.value) return

    const canvas = d3.select(containerRef.value)
      .append('canvas')
      .style('position', 'absolute')

    canvasRef.value = canvas.node()
    context.value = canvasRef.value.getContext('2d')

    // High DPI support
    const rect = containerRef.value.getBoundingClientRect()
    const devicePixelRatio = window.devicePixelRatio || 1
    
    dimensions.value = {
      width: rect.width,
      height: rect.height
    }

    canvas
      .attr('width', rect.width * devicePixelRatio)
      .attr('height', rect.height * devicePixelRatio)
      .style('width', rect.width + 'px')
      .style('height', rect.height + 'px')

    context.value.scale(devicePixelRatio, devicePixelRatio)
  }

  const renderPoints = (data, scales) => {
    if (!context.value) return

    // Clear canvas
    context.value.clearRect(0, 0, dimensions.value.width, dimensions.value.height)

    // Batch rendering for performance
    context.value.fillStyle = '#3b82f6'
    
    for (const point of data) {
      context.value.beginPath()
      context.value.arc(
        scales.x(point.x),
        scales.y(point.y),
        3,
        0,
        2 * Math.PI
      )
      context.value.fill()
    }
  }

  return {
    setupCanvas,
    renderPoints,
    dimensions
  }
}
```

### Optimized D3 Updates

```javascript
// composables/useOptimizedD3.js
export function useOptimizedD3(svg, data, options = {}) {
  const {
    transitionDuration = 750,
    enableTransitions = true,
    useObjectConstancy = true
  } = options

  // Memoized scales
  const scales = computed(() => {
    if (!data.value.length) return null

    return {
      x: d3.scaleLinear()
        .domain(d3.extent(data.value, d => d.x))
        .range([0, dimensions.value.width]),
      
      y: d3.scaleLinear()
        .domain(d3.extent(data.value, d => d.y))
        .range([dimensions.value.height, 0])
    }
  })

  // Optimized data binding
  const updateVisualization = () => {
    if (!svg.value || !scales.value) return

    const t = enableTransitions 
      ? d3.transition().duration(transitionDuration)
      : null

    // Use object constancy for smooth transitions
    const keyFn = useObjectConstancy ? d => d.id : null

    const circles = svg.value
      .selectAll('.data-point')
      .data(data.value, keyFn)

    // Enter
    const enter = circles.enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('r', 0)
      .attr('cx', d => scales.value.x(d.x))
      .attr('cy', d => scales.value.y(d.y))

    if (t) {
      enter.transition(t)
        .attr('r', 4)
    } else {
      enter.attr('r', 4)
    }

    // Update
    const update = circles.merge(enter)
    
    if (t) {
      update.transition(t)
        .attr('cx', d => scales.value.x(d.x))
        .attr('cy', d => scales.value.y(d.y))
    } else {
      update
        .attr('cx', d => scales.value.x(d.x))
        .attr('cy', d => scales.value.y(d.y))
    }

    // Exit
    if (t) {
      circles.exit()
        .transition(t)
        .attr('r', 0)
        .remove()
    } else {
      circles.exit().remove()
    }
  }

  return {
    scales,
    updateVisualization
  }
}
```

### Progressive Rendering

```javascript
// composables/useProgressiveRender.js
export function useProgressiveRender(data, renderFn, options = {}) {
  const {
    batchSize = 1000,
    delay = 16, // ~60fps
    onProgress
  } = options

  const isRendering = ref(false)
  const progress = ref(0)

  const render = async () => {
    isRendering.value = true
    progress.value = 0

    const totalItems = data.value.length
    let renderedItems = 0

    while (renderedItems < totalItems) {
      const endIndex = Math.min(renderedItems + batchSize, totalItems)
      const batch = data.value.slice(renderedItems, endIndex)

      await new Promise(resolve => {
        renderFn(batch, renderedItems)
        
        renderedItems = endIndex
        progress.value = (renderedItems / totalItems) * 100
        
        if (onProgress) {
          onProgress(progress.value)
        }

        setTimeout(resolve, delay)
      })
    }

    isRendering.value = false
    progress.value = 100
  }

  return {
    render,
    isRendering,
    progress
  }
}
```

## Memory Management

### Memory Leak Prevention

```javascript
// composables/useMemoryCleanup.js
export function useMemoryCleanup() {
  const eventListeners = []
  const timers = []
  const observers = []

  const addEventListeners = (element, event, handler, options) => {
    element.addEventListener(event, handler, options)
    eventListeners.push({ element, event, handler, options })
  }

  const addTimer = (timer) => {
    timers.push(timer)
  }

  const addObserver = (observer) => {
    observers.push(observer)
  }

  const cleanup = () => {
    // Remove event listeners
    eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options)
    })
    eventListeners.length = 0

    // Clear timers
    timers.forEach(timer => {
      if (typeof timer === 'number') {
        clearTimeout(timer)
        clearInterval(timer)
      }
    })
    timers.length = 0

    // Disconnect observers
    observers.forEach(observer => {
      if (observer.disconnect) {
        observer.disconnect()
      }
    })
    observers.length = 0
  }

  onUnmounted(cleanup)

  return {
    addEventListeners,
    addTimer,
    addObserver,
    cleanup
  }
}
```

### Efficient Object Pooling

```javascript
// utils/objectPool.js
export class ObjectPool {
  constructor(createFn, resetFn, maxSize = 100) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.pool = []
    this.maxSize = maxSize
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop()
    }
    return this.createFn()
  }

  release(obj) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }
}

// Usage for D3 objects
const circlePool = new ObjectPool(
  () => document.createElementNS('http://www.w3.org/2000/svg', 'circle'),
  (circle) => {
    circle.removeAttribute('cx')
    circle.removeAttribute('cy')
    circle.removeAttribute('r')
  }
)
```

## Network Optimization

### Resource Preloading

```html
<!-- index.html -->
<head>
  <!-- Preload critical resources -->
  <link rel="preload" href="/data/fao_data/index.json" as="fetch" crossorigin>
  <link rel="preconnect" href="https://api.example.com">
  
  <!-- Preload fonts -->
  <link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>
</head>
```

### Compression and Caching

```javascript
// vite.config.js
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    vue(),
    compression({
      algorithm: 'gzip',
      ext: '.gz'
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br'
    })
  ]
})
```

## Mobile Performance

### Touch and Gesture Optimization

```vue
<!-- components/TouchOptimizedChart.vue -->
<template>
  <div
    ref="chartContainer"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    class="touch-chart"
  >
    <!-- Chart content -->
  </div>
</template>

<script setup>
const handleTouchStart = (event) => {
  // Optimize for touch performance
  event.preventDefault()
  
  // Store initial touch position
  const touch = event.touches[0]
  touchState.startX = touch.clientX
  touchState.startY = touch.clientY
}

const handleTouchMove = (event) => {
  // Throttle touch events for performance
  if (Date.now() - lastTouchUpdate < 16) return
  
  lastTouchUpdate = Date.now()
  
  const touch = event.touches[0]
  const deltaX = touch.clientX - touchState.startX
  const deltaY = touch.clientY - touchState.startY
  
  // Update visualization
  updateChart(deltaX, deltaY)
}
</script>

<style>
.touch-chart {
  /* Optimize for touch interactions */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
</style>
```

## Monitoring and Profiling

### Performance Monitoring Setup

```javascript
// services/performanceMonitor.js
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = new Map()
  }

  startMeasure(name) {
    performance.mark(`${name}-start`)
  }

  endMeasure(name) {
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)
    
    const entries = performance.getEntriesByName(name)
    const duration = entries[entries.length - 1].duration
    
    this.metrics.set(name, duration)
    
    // Clean up marks
    performance.clearMarks(`${name}-start`)
    performance.clearMarks(`${name}-end`)
    performance.clearMeasures(name)
    
    return duration
  }

  observeEntry(entryType, callback) {
    if (!this.observers.has(entryType)) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry)
        }
      })
      
      observer.observe({ entryTypes: [entryType] })
      this.observers.set(entryType, observer)
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics)
  }

  disconnect() {
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
  }
}

// Usage
const monitor = new PerformanceMonitor()

monitor.observeEntry('measure', (entry) => {
  console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`)
})

monitor.observeEntry('navigation', (entry) => {
  console.log('Navigation timing:', entry)
})
```

### Bundle Analysis Tools

```bash
# Analyze bundle size
npm run build
npm run bundle-analyzer

# Check for duplicate dependencies
npx duplicate-package-checker-webpack-plugin

# Audit for performance issues
npm audit
lighthouse --only-categories=performance http://localhost:5173
```

This comprehensive performance optimization guide provides the foundation for maintaining excellent performance in the D3 Nutrition Vibes application across all user scenarios and device types.