import { useTourStore } from '../stores/useTourStore'
import { useRouter } from 'vue-router'
import { nextTick } from 'vue'
import { useHighlightTracker } from '../composables/useHighlightTracker'
import { calculateOptimalPosition, createPositionUpdateCallback, cacheManager } from '../utils/tooltipPositioning'

class TourService {
  constructor() {
    this.store = null
    this.router = null
    this.observers = new Map()
    this.animationFrame = null
    this.isInitialized = false
    this.manualTooltipPosition = null
    this.highlightTracker = null
    this.positionUpdateCallback = null
    this.lastCalculatedPosition = null
    this.tooltipResizeObserver = null
    
    // Performance Tracking
    this.performanceMetrics = {
      positionCalculations: 0,
      cacheHits: 0,
      averageCalculationTime: 0,
      lastCalculationTime: 0
    }
    
    // RAF-basierte Update-Queue
    this.updateQueue = new Set()
    this.rafUpdateId = null
  }
  
  // Initialize service with Vue app context
  init(app) {
    if (this.isInitialized) return
    
    // Get store and router from app
    this.store = useTourStore()
    // Get router from app instance
    this.router = app.config.globalProperties.$router
    
    // Initialize highlight tracker
    this.highlightTracker = useHighlightTracker()
    
    // Initialize throttled position update callback
    this.positionUpdateCallback = createPositionUpdateCallback(
      (bounds, element) => this.handleElementBoundsUpdate(bounds, element),
      16 // 60fps
    )
    
    this.isInitialized = true
    
    // Set up global event listeners
    this.setupEventListeners()
    
    console.log('[TourService] Initialized successfully')
  }
  
  // Setup global event listeners
  setupEventListeners() {
    // Handle keyboard navigation for tour
    document.addEventListener('keydown', (e) => {
      if (!this.store.isActive) return
      
      switch (e.key) {
        case 'Escape':
          this.stopTour('escape_key')
          break
        case 'ArrowRight':
        case ' ': // Spacebar
          e.preventDefault()
          if (this.store.canGoNext || this.store.isLastStep) {
            this.nextStep()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (this.store.canGoPrevious) {
            this.previousStep()
          }
          break
        case 'Enter':
          e.preventDefault()
          if (this.store.isLastStep) {
            this.stopTour('completed')
          } else if (this.store.canGoNext) {
            this.nextStep()
          }
          break
      }
    })
    
    // Handle window resize to reposition tooltip
    window.addEventListener('resize', this.debounce(() => {
      if (this.store.isActive && this.store.currentStep) {
        this.updateTooltipPosition()
      }
    }, 250))
  }
  
  // Main Tour Control Methods
  async startTour(tourId = 'main', options = {}) {
    try {
      // Ensure tour is registered
      const tour = this.store.availableTours.find(t => t.id === tourId)
      if (!tour) {
        console.error(`[TourService] Tour '${tourId}' not found`)
        return false
      }
      
      // Start tour in store
      const success = this.store.startTour(tourId, options)
      if (!success) return false
      
      // Wait for DOM update
      await nextTick()
      
      // Navigate to first step
      await this.executeStep(this.store.currentStep)
      
      console.log(`[TourService] Started tour '${tourId}'`)
      return true
      
    } catch (error) {
      console.error('[TourService] Error starting tour:', error)
      this.store.stopTour('error')
      return false
    }
  }
  
  stopTour(reason = 'user_action') {
    this.store.stopTour(reason)
    this.clearHighlights()
    this.cancelPendingAnimations()
    this.cleanupTooltipObservers()
    this.cancelPendingUpdates()
    this.manualTooltipPosition = null // Reset manual position
    this.lastCalculatedPosition = null
    
    // Performance: Log metrics on tour end
    this.logPerformanceMetrics()
    
    console.log(`[TourService] Stopped tour (${reason})`)
  }
  
  pauseTour() {
    this.store.pauseTour()
    console.log('[TourService] Paused tour')
  }
  
  resumeTour() {
    this.store.resumeTour()
    if (this.store.currentStep) {
      this.executeStep(this.store.currentStep)
    }
    console.log('[TourService] Resumed tour')
  }
  
  async nextStep() {
    if (!this.store.canGoNext && !this.store.isLastStep) return false
    
    const success = this.store.nextStep()
    if (success && this.store.currentStep) {
      await this.executeStep(this.store.currentStep)
    }
    return success
  }
  
  async previousStep() {
    if (!this.store.canGoPrevious) return false
    
    const success = this.store.previousStep()
    if (success && this.store.currentStep) {
      await this.executeStep(this.store.currentStep)
    }
    return success
  }
  
  async goToStep(stepIndex) {
    const success = this.store.goToStep(stepIndex)
    if (success && this.store.currentStep) {
      await this.executeStep(this.store.currentStep)
    }
    return success
  }
  
  // Step Execution
  async executeStep(step) {
    if (!step) return
    
    try {
      this.store.isLoading = true
      
      // Navigate to required route if needed
      if (step.route && this.router.currentRoute.value.path !== step.route) {
        await this.navigateToRoute(step.route)
      }
      
      // Wait for element to be available with retries
      let element = await this.waitForElement(step.target, 5000, 3)
      if (!element) {
        console.warn(`[TourService] Target element '${step.target}' not found`)
        // Try to continue with fallback position if specified
        if (step.fallbackPosition) {
          console.log(`[TourService] Using fallback position for step '${step.id}'`)
          this.store.setTooltipPosition(step.fallbackPosition)
          this.store.overlayVisible = true
          this.store.tooltipVisible = true
          return
        }
        // Show error message to user
        this.store.trackEvent('tour_step_error', { 
          stepId: step.id, 
          target: step.target,
          error: 'element_not_found'
        })
        return
      }
      
      // Execute step actions and wait for reactive updates
      if (step.actions?.onEnter) {
        await step.actions.onEnter()
        await nextTick()
        
        // Wait a bit more for reactive updates to propagate
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Re-check if element exists after state changes
        const updatedElement = await this.waitForElement(step.target, 2000)
        if (updatedElement) {
          element = updatedElement
        }
      }
      
      // Scroll to element
      await this.scrollToElement(step.target)
      
      // Wait for scroll to complete before highlighting
      await nextTick()
      
      // Highlight element with dynamic tracking
      const highlightSuccess = this.highlightElement(step.target, step.highlightOptions)
      if (!highlightSuccess) {
        console.warn(`[TourService] Failed to highlight element '${step.target}'`)
      }
      
      // Position tooltip after highlighting
      await this.updateTooltipPosition(element, step.position)
      
      // Show overlay and tooltip with smooth transition
      this.store.overlayVisible = true
      
      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 50))
      
      this.store.tooltipVisible = true
      
      // Final wait to ensure everything is rendered
      await nextTick()
      
      // Add entrance animation class
      const tooltipEl = document.querySelector('.tour-tooltip')
      if (tooltipEl) {
        tooltipEl.classList.add('tour-entering')
        setTimeout(() => {
          tooltipEl.classList.remove('tour-entering')
        }, 300)
      }
      
    } catch (error) {
      console.error('[TourService] Error executing step:', error)
    } finally {
      this.store.isLoading = false
    }
  }
  
  // Navigation Methods
  async navigateToRoute(route) {
    return new Promise((resolve) => {
      this.router.push(route).then(() => {
        // Wait a bit longer for route transition
        setTimeout(resolve, 300)
      })
    })
  }
  
  async scrollToElement(selector, behavior = 'smooth') {
    const element = document.querySelector(selector)
    if (!element) return false
    
    // Get element position
    const rect = element.getBoundingClientRect()
    const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight
    
    if (!isInViewport) {
      element.scrollIntoView({
        behavior: this.store.skipAnimations ? 'auto' : behavior,
        block: 'center',
        inline: 'nearest'
      })
      
      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return true
  }
  
  // Element Management
  async waitForElement(selector, timeout = 5000, retries = 3) {
    const attemptFind = async (remainingRetries) => {
      return new Promise((resolve) => {
        const element = document.querySelector(selector)
        if (element) {
          resolve(element)
          return
        }
        
        // Set up observer
        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector)
          if (element) {
            observer.disconnect()
            clearTimeout(timeoutId)
            resolve(element)
          }
        })
        
        // Start observing
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true, // Also watch for attribute changes
          attributeOldValue: true
        })
        
        // Set timeout
        const timeoutId = setTimeout(() => {
          observer.disconnect()
          resolve(null)
        }, timeout)
      })
    }
    
    // Try multiple times with increasing delays
    for (let i = 0; i < retries; i++) {
      const element = await attemptFind(retries - i)
      if (element) {
        return element
      }
      
      // If not last retry, wait before trying again
      if (i < retries - 1) {
        console.log(`[TourService] Element '${selector}' not found, retrying... (${i + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1))) // Increasing delay
      }
    }
    
    console.warn(`[TourService] Element '${selector}' not found after ${retries} retries`)
    return null
  }
  
  highlightElement(selector, options = {}) {
    const element = document.querySelector(selector)
    if (!element) return false
    
    // Remove previous highlights
    this.clearHighlights()
    
    // Start dynamic tracking for this element
    const success = this.highlightTracker.startTracking(
      selector,
      (bounds, element) => {
        // Update store with new bounds
        this.store.setHighlightedElement(selector, bounds)
        // Trigger tooltip position recalculation
        this.positionUpdateCallback(bounds, element)
      },
      {
        padding: options.padding || 8,
        throttle: 16 // 60fps updates
      }
    )
    
    if (!success) return false
    
    // Add highlight class for CSS styling
    element.classList.add('tour-highlight')
    
    // Ensure element is above backdrop but below tooltip
    const originalZIndex = element.style.zIndex
    const originalPosition = element.style.position
    
    // Store original styles for restoration
    element.setAttribute('data-original-z-index', originalZIndex || '')
    element.setAttribute('data-original-position', originalPosition || '')
    
    // Apply tour-specific styling
    element.style.zIndex = '9998'
    
    // Ensure element has position if needed for z-index to work
    const computedPosition = window.getComputedStyle(element).position
    if (computedPosition === 'static') {
      element.style.position = 'relative'
    }
    
    // Also ensure parent containers don't block the highlight
    this.ensureParentZIndex(element)
    
    return true
  }
  
  ensureParentZIndex(element) {
    // Track modified elements for cleanup
    if (!this.modifiedParents) {
      this.modifiedParents = new Set()
    }
    
    let parent = element.parentElement
    while (parent && parent !== document.body) {
      const computedStyle = window.getComputedStyle(parent)
      const zIndex = computedStyle.zIndex
      const position = computedStyle.position
      
      // Check if parent has z-index that might block our highlight
      if (zIndex !== 'auto' && parseInt(zIndex) < 9998) {
        parent.setAttribute('data-original-parent-z-index', zIndex)
        parent.style.zIndex = '9997' // Just below highlight
        this.modifiedParents.add(parent)
      }
      
      // Check for overflow hidden that might clip the highlight
      if (computedStyle.overflow === 'hidden' || computedStyle.overflowX === 'hidden' || computedStyle.overflowY === 'hidden') {
        parent.setAttribute('data-original-overflow', computedStyle.overflow)
        parent.style.overflow = 'visible'
        this.modifiedParents.add(parent)
      }
      
      parent = parent.parentElement
    }
  }
  
  clearHighlights() {
    // Stop all dynamic tracking
    if (this.highlightTracker) {
      this.highlightTracker.stopAllTracking()
    }
    
    // Remove highlight classes and restore original styles
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
      
      // Restore original z-index
      const originalZIndex = el.getAttribute('data-original-z-index')
      if (originalZIndex) {
        el.style.zIndex = originalZIndex
      } else {
        el.style.removeProperty('z-index')
      }
      el.removeAttribute('data-original-z-index')
      
      // Restore original position
      const originalPosition = el.getAttribute('data-original-position')
      if (originalPosition) {
        el.style.position = originalPosition
      } else {
        el.style.removeProperty('position')
      }
      el.removeAttribute('data-original-position')
    })
    
    // Restore modified parent elements
    if (this.modifiedParents) {
      this.modifiedParents.forEach(parent => {
        const originalZIndex = parent.getAttribute('data-original-parent-z-index')
        if (originalZIndex) {
          parent.style.zIndex = originalZIndex
          parent.removeAttribute('data-original-parent-z-index')
        }
        
        const originalOverflow = parent.getAttribute('data-original-overflow')
        if (originalOverflow) {
          parent.style.overflow = originalOverflow
          parent.removeAttribute('data-original-overflow')
        }
      })
      this.modifiedParents.clear()
    }
    
    // Clear store
    this.store.setHighlightedElement(null, null)
  }
  
  async updateTooltipPosition(element = null, preferredPosition = 'auto') {
    // Performance: Start timing
    const startTime = performance.now()
    
    // If user has manually positioned the tooltip, keep that position
    if (this.manualTooltipPosition) {
      this.store.setTooltipPosition(this.manualTooltipPosition)
      return
    }
    
    if (!element && this.store.highlightedElement) {
      element = document.querySelector(this.store.highlightedElement)
    }
    
    if (!element) return
    
    // Wait for next tick to ensure DOM is updated
    await nextTick()
    
    const elementBounds = element.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    
    // Get current tooltip content size
    const contentSize = this.getTooltipContentSize()
    
    // Get current tooltip constraints from store
    const constraints = this.store.tooltipConstraints || {
      minWidth: 300,
      maxWidth: 600,
      minHeight: 200,
      maxHeight: 500
    }
    
    // Calculate optimal position and size
    const result = calculateOptimalPosition(
      elementBounds,
      contentSize,
      viewport,
      {
        preferredPosition,
        constraints,
        adaptive: true,
        useCache: true // Enable caching for performance
      }
    )
    
    // Performance: Track metrics
    const calculationTime = performance.now() - startTime
    this.updatePerformanceMetrics(calculationTime, result.fromCache)
    
    // Update store with new position and dimensions
    this.store.setTooltipPosition({
      top: result.position.top,
      left: result.position.left
    })
    
    this.store.setTooltipDimensions(result.size)
    
    // Update floating mode state
    this.store.setFloatingMode(result.metadata.isFloating || false)
    
    // Store positioning metadata for debugging and future optimizations
    this.store.setPositioningMetadata({
      position: result.metadata.position,
      isOptimal: result.metadata.isOptimal,
      hasOverlap: result.metadata.hasOverlap,
      isVisible: result.metadata.isVisible,
      wasResized: result.metadata.wasResized,
      originalSize: result.metadata.originalSize,
      timestamp: Date.now()
    })
    
    // Store calculation result for debugging
    this.lastCalculatedPosition = {
      ...result,
      timestamp: Date.now(),
      elementBounds,
      viewport
    }
    
    // Log positioning info for debugging
    if (result.metadata.isFloating) {
      console.log('[TourService] Using floating position:', result.metadata.position)
    }
    
    if (result.metadata.wasResized) {
      console.log('[TourService] Tooltip was resized:', {
        original: result.metadata.originalSize,
        final: result.size
      })
    }
    
    if (result.metadata.hasOverlap) {
      console.warn('[TourService] Tooltip still overlaps with element despite calculations')
    }
    
    return result
  }
  
  
  // Tour Registration
  registerTour(tour) {
    this.store.registerTour(tour)
  }
  
  registerTours(tours) {
    tours.forEach(tour => this.registerTour(tour))
  }
  
  // Utility Methods
  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }
  
  cancelPendingAnimations() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }
  
  // Manual positioning
  setManualTooltipPosition(position) {
    this.manualTooltipPosition = {
      left: position.x,
      top: position.y
    }
  }
  
  resetManualTooltipPosition() {
    this.manualTooltipPosition = null
  }
  
  // New helper methods for intelligent positioning
  
  /**
   * Handles real-time element bounds updates from highlightTracker
   * @param {Object} bounds - Updated element bounds
   * @param {Element} element - The tracked element
   */
  handleElementBoundsUpdate(bounds, element) {
    if (!this.store.isActive || !this.store.tooltipVisible) return
    
    // Only update if bounds actually changed significantly
    if (this.lastCalculatedPosition && this.boundsChangedSignificantly(bounds, this.lastCalculatedPosition.elementBounds)) {
      // Check if current tooltip position now overlaps with new element bounds
      const currentTooltipBounds = this.getCurrentTooltipBounds()
      
      if (currentTooltipBounds && this.checkCurrentOverlap(bounds, currentTooltipBounds)) {
        // Immediate overlap detected, recalculate position with higher priority
        console.log('[TourService] Overlap detected during bounds update, recalculating position')
        this.updateTooltipPosition(element)
      } else if (this.lastCalculatedPosition && Date.now() - this.lastCalculatedPosition.timestamp > 1000) {
        // Periodic recalculation to ensure optimal positioning
        this.updateTooltipPosition(element)
      }
    }
  }
  
  /**
   * Checks if element bounds changed significantly enough to warrant repositioning
   * @param {Object} newBounds - New element bounds
   * @param {Object} oldBounds - Previous element bounds
   * @returns {boolean} True if significant change detected
   */
  boundsChangedSignificantly(newBounds, oldBounds) {
    if (!oldBounds) return true
    
    const threshold = 5 // pixels
    return Math.abs(newBounds.top - oldBounds.top) > threshold ||
           Math.abs(newBounds.left - oldBounds.left) > threshold ||
           Math.abs(newBounds.width - oldBounds.width) > threshold ||
           Math.abs(newBounds.height - oldBounds.height) > threshold
  }
  
  /**
   * Gets the natural content size of the tooltip
   * @returns {Object} Content size {width, height}
   */
  getTooltipContentSize() {
    const tooltipEl = document.querySelector('.tour-tooltip')
    
    if (!tooltipEl) {
      return { width: 400, height: 300 } // Default size
    }
    
    // Get current size or measure content
    const currentRect = tooltipEl.getBoundingClientRect()
    
    // If tooltip is already visible, use its current size as baseline
    if (currentRect.width > 0 && currentRect.height > 0) {
      return {
        width: currentRect.width,
        height: currentRect.height
      }
    }
    
    // Fallback: measure content by temporarily making visible
    const originalStyle = {
      position: tooltipEl.style.position,
      visibility: tooltipEl.style.visibility,
      top: tooltipEl.style.top,
      left: tooltipEl.style.left
    }
    
    tooltipEl.style.position = 'absolute'
    tooltipEl.style.visibility = 'hidden'
    tooltipEl.style.top = '-9999px'
    tooltipEl.style.left = '-9999px'
    
    const measuredRect = tooltipEl.getBoundingClientRect()
    const contentSize = {
      width: measuredRect.width || 400,
      height: measuredRect.height || 300
    }
    
    // Restore original styles
    Object.assign(tooltipEl.style, originalStyle)
    
    return contentSize
  }
  
  /**
   * Sets up ResizeObserver for tooltip content to detect size changes
   * @param {Element} tooltipElement - The tooltip DOM element
   */
  setupTooltipResizeObserver(tooltipElement) {
    if (!window.ResizeObserver || this.tooltipResizeObserver) return
    
    this.tooltipResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === tooltipElement) {
          // Content size changed, recalculate position
          const newSize = {
            width: entry.contentRect.width,
            height: entry.contentRect.height
          }
          
          // Only update if user hasn't manually positioned
          if (!this.manualTooltipPosition) {
            this.updateTooltipPosition()
          }
        }
      }
    })
    
    this.tooltipResizeObserver.observe(tooltipElement)
  }
  
  /**
   * Cleanup method for tooltip observers
   */
  cleanupTooltipObservers() {
    if (this.tooltipResizeObserver) {
      this.tooltipResizeObserver.disconnect()
      this.tooltipResizeObserver = null
    }
  }
  
  /**
   * Gets current tooltip boundaries from DOM
   * @returns {Object|null} Current tooltip bounds
   */
  getCurrentTooltipBounds() {
    const tooltipEl = document.querySelector('.tour-tooltip')
    if (!tooltipEl) return null
    
    const rect = tooltipEl.getBoundingClientRect()
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right
    }
  }
  
  /**
   * Checks if tooltip currently overlaps with element
   * @param {Object} elementBounds - Element boundaries
   * @param {Object} tooltipBounds - Tooltip boundaries  
   * @returns {boolean} True if overlap detected
   */
  checkCurrentOverlap(elementBounds, tooltipBounds) {
    // Import the function at the top of the class instead
    return !(tooltipBounds.right < elementBounds.left || 
             tooltipBounds.left > elementBounds.right || 
             tooltipBounds.bottom < elementBounds.top || 
             tooltipBounds.top > elementBounds.bottom)
  }
  
  /**
   * Force recalculation of tooltip position (for edge cases)
   * @param {string} reason - Reason for forced recalculation
   */
  forcePositionRecalculation(reason = 'manual') {
    console.log(`[TourService] Forcing position recalculation: ${reason}`)
    
    if (!this.store.isActive || !this.store.tooltipVisible) return
    
    const element = this.store.highlightedElement 
      ? document.querySelector(this.store.highlightedElement)
      : null
      
    if (element) {
      // Reset manual position temporarily to allow recalculation
      const wasManual = this.manualTooltipPosition
      this.manualTooltipPosition = null
      
      this.updateTooltipPosition(element).then(() => {
        // Restore manual position if it was set
        if (wasManual) {
          setTimeout(() => {
            this.manualTooltipPosition = wasManual
          }, 100)
        }
      })
    }
  }
  
  /**
   * Debug method to get positioning statistics
   * @returns {Object} Positioning debug information
   */
  getPositioningDebugInfo() {
    return {
      lastCalculatedPosition: this.lastCalculatedPosition,
      manualTooltipPosition: this.manualTooltipPosition,
      currentTooltipBounds: this.getCurrentTooltipBounds(),
      performanceMetrics: this.performanceMetrics,
      cacheStats: cacheManager.getStats(),
      store: {
        tooltipPosition: this.store.tooltipPosition,
        tooltipDimensions: this.store.tooltipDimensions,
        floatingMode: this.store.floatingMode,
        positioningMetadata: this.store.positioningMetadata
      }
    }
  }
  
  // Performance-Optimierungs-Methoden
  
  /**
   * Updates performance metrics
   * @param {number} calculationTime - Zeit für Berechnung in ms
   * @param {boolean} fromCache - Ob Ergebnis aus Cache kam
   */
  updatePerformanceMetrics(calculationTime, fromCache = false) {
    this.performanceMetrics.lastCalculationTime = calculationTime
    
    if (fromCache) {
      this.performanceMetrics.cacheHits++
    } else {
      this.performanceMetrics.positionCalculations++
      
      // Update average calculation time
      const totalCalculations = this.performanceMetrics.positionCalculations
      const currentAverage = this.performanceMetrics.averageCalculationTime
      this.performanceMetrics.averageCalculationTime = 
        (currentAverage * (totalCalculations - 1) + calculationTime) / totalCalculations
    }
  }
  
  /**
   * Logs performance metrics
   */
  logPerformanceMetrics() {
    const metrics = this.performanceMetrics
    const cacheStats = cacheManager.getStats()
    
    console.log('[TourService] Performance Metrics:', {
      calculations: metrics.positionCalculations,
      cacheHits: metrics.cacheHits,
      cacheHitRate: metrics.cacheHits / (metrics.positionCalculations + metrics.cacheHits) * 100,
      avgCalculationTime: metrics.averageCalculationTime.toFixed(2) + 'ms',
      lastCalculationTime: metrics.lastCalculationTime.toFixed(2) + 'ms',
      cacheSize: cacheStats.size
    })
  }
  
  /**
   * RAF-basierte Update-Queue für batch updates
   * @param {Function} updateFn - Update-Funktion
   */
  queueUpdate(updateFn) {
    this.updateQueue.add(updateFn)
    
    if (!this.rafUpdateId) {
      this.rafUpdateId = requestAnimationFrame(() => {
        // Alle queued updates ausführen
        for (const updateFn of this.updateQueue) {
          try {
            updateFn()
          } catch (error) {
            console.error('[TourService] Error in queued update:', error)
          }
        }
        
        this.updateQueue.clear()
        this.rafUpdateId = null
      })
    }
  }
  
  /**
   * Cancels all pending RAF updates
   */
  cancelPendingUpdates() {
    if (this.rafUpdateId) {
      cancelAnimationFrame(this.rafUpdateId)
      this.rafUpdateId = null
    }
    this.updateQueue.clear()
  }
  
  /**
   * Optimized position update using RAF queue
   * @param {Element} element - Target element
   */
  queuePositionUpdate(element) {
    this.queueUpdate(() => {
      this.updateTooltipPosition(element)
    })
  }
  
  /**
   * Clear positioning cache (useful for debugging)
   */
  clearPositioningCache() {
    cacheManager.clearCache()
    console.log('[TourService] Positioning cache cleared')
  }
  
  /**
   * Enable/disable performance optimizations
   * @param {boolean} enabled - Whether to enable optimizations
   */
  setPerformanceOptimizations(enabled) {
    this.store.setUserPreference('performanceOptimizations', enabled)
    
    if (!enabled) {
      this.clearPositioningCache()
      console.log('[TourService] Performance optimizations disabled')
    } else {
      console.log('[TourService] Performance optimizations enabled')
    }
  }
  
  // Data Integration Helpers (for tour content)
  async setProductSelection(product) {
    // Import stores dynamically to avoid circular dependencies
    const { useUIStore } = await import('@/stores/useUIStore')
    const uiStore = useUIStore()
    uiStore.selectedProduct = product
    await nextTick()
    // Wait for reactive updates to propagate
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  async setYearSelection(year) {
    const { useUIStore } = await import('@/stores/useUIStore')
    const uiStore = useUIStore()
    uiStore.selectedYear = year
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  async setCountrySelection(country) {
    const { useUIStore } = await import('@/stores/useUIStore')
    const uiStore = useUIStore()
    uiStore.selectedCountry = country
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  async setMetricSelection(metric) {
    const { useUIStore } = await import('@/stores/useUIStore')
    const uiStore = useUIStore()
    uiStore.selectedMetric = metric
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  // Enhanced method for multiple selections with validation
  async setUISelections(selections = {}, retries = 3) {
    const { useUIStore } = await import('@/stores/useUIStore')
    const uiStore = useUIStore()
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      // Apply all selections
      if (selections.product !== undefined) uiStore.selectedProduct = selections.product
      if (selections.country !== undefined) uiStore.selectedCountry = selections.country
      if (selections.metric !== undefined) uiStore.selectedMetric = selections.metric
      if (selections.year !== undefined) uiStore.selectedYear = selections.year
      
      // Wait for all reactive updates
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100 * attempt)) // Increasing delay
      
      // Validate selections were applied
      const finalState = {
        product: uiStore.selectedProduct,
        country: uiStore.selectedCountry,
        metric: uiStore.selectedMetric,
        year: uiStore.selectedYear
      }
      
      // Check if all selections were applied correctly
      let allApplied = true
      for (const [key, value] of Object.entries(selections)) {
        if (value !== undefined && finalState[key] !== value) {
          allApplied = false
          console.warn(`[TourService] Selection '${key}' not applied correctly. Expected: ${value}, Got: ${finalState[key]}`)
          break
        }
      }
      
      if (allApplied) {
        console.log('[TourService] UI selections applied successfully:', finalState)
        return finalState
      }
      
      if (attempt < retries) {
        console.log(`[TourService] Retrying UI selections... (${attempt}/${retries})`)
      }
    }
    
    console.error('[TourService] Failed to apply UI selections after retries:', selections)
    return null
  }
}

// Export singleton instance
export default new TourService()