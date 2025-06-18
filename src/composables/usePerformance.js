import { ref, onMounted, onUnmounted } from 'vue'

export function usePerformance() {
  const performanceMetrics = ref({
    renderTime: 0,
    componentMountTime: 0,
    dataLoadTime: 0,
    memoryUsage: 0,
    frameRate: 0
  })

  const isProfilerActive = ref(false)
  const observer = ref(null)
  let frameCount = 0
  let lastTime = performance.now()

  const startProfiling = () => {
    isProfilerActive.value = true
    startFrameRateMonitoring()
    startMemoryMonitoring()
  }

  const stopProfiling = () => {
    isProfilerActive.value = false
    stopFrameRateMonitoring()
    stopMemoryMonitoring()
  }

  const measureRenderTime = (callback) => {
    const start = performance.now()
    const result = callback()
    const end = performance.now()
    
    performanceMetrics.value.renderTime = end - start
    
    if (performanceMetrics.value.renderTime > 16) {
      console.warn(`Slow render detected: ${performanceMetrics.value.renderTime.toFixed(2)}ms`)
    }
    
    return result
  }

  const measureAsyncOperation = async (operation, operationType = 'operation') => {
    const start = performance.now()
    
    try {
      const result = await operation()
      const end = performance.now()
      
      performanceMetrics.value[`${operationType}Time`] = end - start
      
      return result
    } catch (error) {
      const end = performance.now()
      performanceMetrics.value[`${operationType}Time`] = end - start
      throw error
    }
  }

  const measureComponentMount = () => {
    const start = performance.now()
    
    onMounted(() => {
      const end = performance.now()
      performanceMetrics.value.componentMountTime = end - start
      
      if (performanceMetrics.value.componentMountTime > 100) {
        console.warn(`Slow component mount: ${performanceMetrics.value.componentMountTime.toFixed(2)}ms`)
      }
    })
  }

  const startFrameRateMonitoring = () => {
    const measureFrameRate = () => {
      if (!isProfilerActive.value) return
      
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime - lastTime >= 1000) {
        performanceMetrics.value.frameRate = Math.round((frameCount * 1000) / (currentTime - lastTime))
        frameCount = 0
        lastTime = currentTime
        
        if (performanceMetrics.value.frameRate < 30) {
          console.warn(`Low frame rate detected: ${performanceMetrics.value.frameRate} FPS`)
        }
      }
      
      requestAnimationFrame(measureFrameRate)
    }
    
    requestAnimationFrame(measureFrameRate)
  }

  const stopFrameRateMonitoring = () => {
    frameCount = 0
    lastTime = performance.now()
  }

  const startMemoryMonitoring = () => {
    if (!window.performance?.memory) {
      console.warn('Memory monitoring not available in this browser')
      return
    }

    const updateMemoryUsage = () => {
      if (!isProfilerActive.value) return
      
      const memory = window.performance.memory
      performanceMetrics.value.memoryUsage = {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      }
      
      // Warning if memory usage is high
      if (performanceMetrics.value.memoryUsage.usedJSHeapSize > 100) {
        console.warn(`High memory usage: ${performanceMetrics.value.memoryUsage.usedJSHeapSize}MB`)
      }
      
      setTimeout(updateMemoryUsage, 5000) // Check every 5 seconds
    }
    
    updateMemoryUsage()
  }

  const stopMemoryMonitoring = () => {
    // Memory monitoring stops automatically when isProfilerActive becomes false
  }

  const observeElementPerformance = (element) => {
    if (!element || !window.PerformanceObserver) return

    observer.value = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log(`Performance measure: ${entry.name} took ${entry.duration.toFixed(2)}ms`)
        }
      }
    })

    observer.value.observe({ entryTypes: ['measure'] })
  }

  const markPerformance = (name) => {
    if (window.performance?.mark) {
      performance.mark(name)
    }
  }

  const measurePerformance = (name, startMark, endMark) => {
    if (window.performance?.measure) {
      performance.measure(name, startMark, endMark)
    }
  }

  const getPerformanceReport = () => {
    const report = {
      ...performanceMetrics.value,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    }

    return report
  }

  const logPerformanceWarning = (message, data = {}) => {
    console.warn(`[Performance Warning] ${message}`, {
      ...data,
      timestamp: performance.now(),
      metrics: performanceMetrics.value
    })
  }

  // Core Web Vitals monitoring
  const observeWebVitals = () => {
    if (!window.PerformanceObserver) return

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.startTime < performance.now()) {
          console.log(`LCP: ${entry.startTime.toFixed(2)}ms`)
          if (entry.startTime > 2500) {
            logPerformanceWarning('Poor LCP detected', { lcp: entry.startTime })
          }
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = entry.processingStart - entry.startTime
        console.log(`FID: ${fid.toFixed(2)}ms`)
        if (fid > 100) {
          logPerformanceWarning('Poor FID detected', { fid })
        }
      }
    }).observe({ type: 'first-input', buffered: true })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }
      console.log(`CLS: ${clsValue.toFixed(4)}`)
      if (clsValue > 0.1) {
        logPerformanceWarning('Poor CLS detected', { cls: clsValue })
      }
    }).observe({ type: 'layout-shift', buffered: true })
  }

  onMounted(() => {
    observeWebVitals()
  })

  onUnmounted(() => {
    stopProfiling()
    if (observer.value) {
      observer.value.disconnect()
    }
  })

  return {
    performanceMetrics,
    isProfilerActive,
    startProfiling,
    stopProfiling,
    measureRenderTime,
    measureAsyncOperation,
    measureComponentMount,
    observeElementPerformance,
    markPerformance,
    measurePerformance,
    getPerformanceReport,
    logPerformanceWarning
  }
}