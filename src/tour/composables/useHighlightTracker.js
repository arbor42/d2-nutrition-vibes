import { ref, onMounted, onUnmounted } from 'vue'

export function useHighlightTracker() {
  const trackedElements = ref(new Map())
  const isTrackingActive = ref(false)
  
  let resizeObserver = null
  let mutationObserver = null
  let scrollHandler = null
  let rafId = null

  const startTracking = (selector, callback, options = {}) => {
    const element = document.querySelector(selector)
    if (!element) return false

    const trackingData = {
      element,
      selector,
      callback,
      options: {
        padding: options.padding || 8,
        throttle: options.throttle || 16, // ~60fps
        ...options
      },
      lastBounds: null
    }

    trackedElements.value.set(selector, trackingData)
    
    // Initialize tracking systems if not already active
    if (!isTrackingActive.value) {
      initializeTracking()
    }
    
    // Immediately calculate and callback with initial bounds
    updateElementBounds(trackingData)
    
    return true
  }

  const stopTracking = (selector) => {
    trackedElements.value.delete(selector)
    
    // Stop tracking if no elements remain
    if (trackedElements.value.size === 0) {
      cleanupTracking()
    }
  }

  const stopAllTracking = () => {
    trackedElements.value.clear()
    cleanupTracking()
  }

  const initializeTracking = () => {
    if (isTrackingActive.value) return
    
    isTrackingActive.value = true
    
    // ResizeObserver for element size changes
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const element = entry.target
          const trackingData = findTrackingDataByElement(element)
          if (trackingData) {
            scheduleUpdate(trackingData)
          }
        }
      })
    }
    
    // MutationObserver for DOM changes that might affect position
    mutationObserver = new MutationObserver((mutations) => {
      let needsUpdate = false
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || 
            mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || 
             mutation.attributeName === 'style')) {
          needsUpdate = true
          break
        }
      }
      
      if (needsUpdate) {
        scheduleUpdateAll()
      }
    })
    
    // Scroll handler for scroll-based position changes
    scrollHandler = throttle(() => {
      scheduleUpdateAll()
    }, 16) // ~60fps
    
    // Start observing
    if (resizeObserver) {
      // Will be added per element
    }
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    })
    
    // Add scroll listeners to window and scrollable elements
    window.addEventListener('scroll', scrollHandler, { passive: true })
    document.addEventListener('scroll', scrollHandler, { passive: true, capture: true })
  }

  const cleanupTracking = () => {
    if (!isTrackingActive.value) return
    
    isTrackingActive.value = false
    
    // Cleanup observers
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    
    if (mutationObserver) {
      mutationObserver.disconnect()
      mutationObserver = null
    }
    
    // Remove scroll listeners
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler)
      document.removeEventListener('scroll', scrollHandler, { capture: true })
      scrollHandler = null
    }
    
    // Cancel pending updates
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const scheduleUpdate = (trackingData) => {
    // Use RAF to batch updates and avoid excessive calculations
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        updateElementBounds(trackingData)
        rafId = null
      })
    }
  }

  const scheduleUpdateAll = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        for (const trackingData of trackedElements.value.values()) {
          updateElementBounds(trackingData)
        }
        rafId = null
      })
    }
  }

  const updateElementBounds = (trackingData) => {
    const { element, callback, options, selector } = trackingData
    
    // Check if element is still in DOM
    if (!document.contains(element)) {
      console.warn(`[HighlightTracker] Element ${selector} no longer in DOM, stopping tracking`)
      stopTracking(selector)
      return
    }
    
    // Check if element is visible
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') {
      return
    }
    
    const rect = element.getBoundingClientRect()
    const padding = options.padding
    
    const bounds = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2)
    }
    
    // Only callback if bounds actually changed (avoid unnecessary updates)
    if (!trackingData.lastBounds || 
        !boundsEqual(bounds, trackingData.lastBounds)) {
      trackingData.lastBounds = { ...bounds }
      callback(bounds, element)
    }
  }

  const findTrackingDataByElement = (element) => {
    for (const trackingData of trackedElements.value.values()) {
      if (trackingData.element === element) {
        return trackingData
      }
    }
    return null
  }

  const boundsEqual = (a, b) => {
    return Math.abs(a.top - b.top) < 1 &&
           Math.abs(a.left - b.left) < 1 &&
           Math.abs(a.width - b.width) < 1 &&
           Math.abs(a.height - b.height) < 1
  }

  const throttle = (func, wait) => {
    let timeout
    let lastExecTime = 0
    
    return function executedFunction(...args) {
      const currentTime = Date.now()
      
      if (currentTime - lastExecTime > wait) {
        func.apply(this, args)
        lastExecTime = currentTime
      } else {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          func.apply(this, args)
          lastExecTime = Date.now()
        }, wait - (currentTime - lastExecTime))
      }
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupTracking()
  })

  return {
    startTracking,
    stopTracking,
    stopAllTracking,
    isTrackingActive,
    trackedElements: trackedElements.value
  }
}