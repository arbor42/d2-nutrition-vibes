import { useTourStore } from '../stores/useTourStore'
import { useRouter } from 'vue-router'
import { nextTick } from 'vue'
import { useHighlightTracker } from '../composables/useHighlightTracker'

class TourService {
  constructor() {
    this.store = null
    this.router = null
    this.observers = new Map()
    this.animationFrame = null
    this.isInitialized = false
    this.manualTooltipPosition = null
    this.highlightTracker = null
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
    this.manualTooltipPosition = null // Reset manual position
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
      
      // Wait for element to be available
      let element = await this.waitForElement(step.target)
      if (!element) {
        console.warn(`[TourService] Target element '${step.target}' not found`)
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
      
      // Show overlay and tooltip
      this.store.overlayVisible = true
      this.store.tooltipVisible = true
      
      // Final wait to ensure everything is rendered
      await nextTick()
      
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
  async waitForElement(selector, timeout = 5000) {
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
        subtree: true
      })
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        observer.disconnect()
        resolve(null)
      }, timeout)
    })
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
    element.style.zIndex = '9998'
    element.setAttribute('data-original-z-index', originalZIndex || '')
    
    return true
  }
  
  clearHighlights() {
    // Stop all dynamic tracking
    if (this.highlightTracker) {
      this.highlightTracker.stopAllTracking()
    }
    
    // Remove highlight classes and restore z-index
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
    })
    
    // Clear store
    this.store.setHighlightedElement(null, null)
  }
  
  async updateTooltipPosition(element = null, preferredPosition = 'bottom') {
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
    
    const rect = element.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    
    // Dynamic tooltip sizing based on content
    const tooltipEl = document.querySelector('.tour-tooltip')
    let tooltipWidth = 400
    let tooltipHeight = 300
    
    if (tooltipEl) {
      const tooltipRect = tooltipEl.getBoundingClientRect()
      tooltipWidth = tooltipRect.width || 400
      tooltipHeight = tooltipRect.height || 300
    }
    
    // Ensure responsive sizing
    tooltipWidth = Math.min(tooltipWidth, viewport.width - 40)
    tooltipHeight = Math.min(tooltipHeight, viewport.height - 40)
    
    const spacing = 20
    const padding = 20
    
    let position = { top: 0, left: 0 }
    
    // Smart positioning based on available space
    const spaceAbove = rect.top - padding
    const spaceBelow = viewport.height - rect.bottom - padding
    const spaceLeft = rect.left - padding
    const spaceRight = viewport.width - rect.right - padding
    
    // Choose best position based on available space
    if (preferredPosition === 'center') {
      position.top = Math.max(padding, (viewport.height - tooltipHeight) / 2)
      position.left = Math.max(padding, (viewport.width - tooltipWidth) / 2)
    } else if (preferredPosition === 'bottom' && spaceBelow >= tooltipHeight) {
      position.top = rect.bottom + spacing
      position.left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
    } else if (preferredPosition === 'top' && spaceAbove >= tooltipHeight) {
      position.top = rect.top - tooltipHeight - spacing
      position.left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
    } else if (preferredPosition === 'right' && spaceRight >= tooltipWidth) {
      position.top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
      position.left = rect.right + spacing
    } else if (preferredPosition === 'left' && spaceLeft >= tooltipWidth) {
      position.top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
      position.left = rect.left - tooltipWidth - spacing
    } else {
      // Fallback: Find best available position
      if (spaceBelow >= tooltipHeight) {
        position.top = rect.bottom + spacing
        position.left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
      } else if (spaceAbove >= tooltipHeight) {
        position.top = rect.top - tooltipHeight - spacing
        position.left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
      } else if (spaceRight >= tooltipWidth) {
        position.top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
        position.left = rect.right + spacing
      } else if (spaceLeft >= tooltipWidth) {
        position.top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
        position.left = rect.left - tooltipWidth - spacing
      } else {
        // Last resort: center on screen
        position.top = Math.max(padding, (viewport.height - tooltipHeight) / 2)
        position.left = Math.max(padding, (viewport.width - tooltipWidth) / 2)
      }
    }
    
    // Constrain to viewport with padding
    position.left = Math.max(padding, Math.min(position.left, viewport.width - tooltipWidth - padding))
    position.top = Math.max(padding, Math.min(position.top, viewport.height - tooltipHeight - padding))
    
    this.store.setTooltipPosition(position)
  }
  
  calculateBestPosition(rect, tooltipWidth, tooltipHeight, spacing) {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    
    // Check available space in each direction
    const spaces = {
      top: rect.top - spacing,
      bottom: viewport.height - rect.bottom - spacing,
      left: rect.left - spacing,
      right: viewport.width - rect.right - spacing
    }
    
    // Find best position with most space
    const bestDirection = Object.keys(spaces).reduce((a, b) => 
      spaces[a] > spaces[b] ? a : b
    )
    
    return this.calculatePositionForDirection(rect, tooltipWidth, tooltipHeight, spacing, bestDirection)
  }
  
  calculatePositionForDirection(rect, tooltipWidth, tooltipHeight, spacing, direction) {
    const position = { top: 0, left: 0 }
    
    switch (direction) {
      case 'top':
        position.top = rect.top - tooltipHeight - spacing
        position.left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
        break
      case 'bottom':
        position.top = rect.bottom + spacing
        position.left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
        break
      case 'left':
        position.top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
        position.left = rect.left - tooltipWidth - spacing
        break
      case 'right':
        position.top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
        position.left = rect.right + spacing
        break
    }
    
    return position
  }
  
  constrainToViewport(position, width, height) {
    const padding = 20
    
    // Constrain horizontal
    if (position.left < padding) {
      position.left = padding
    } else if (position.left + width > window.innerWidth - padding) {
      position.left = window.innerWidth - width - padding
    }
    
    // Constrain vertical
    if (position.top < padding) {
      position.top = padding
    } else if (position.top + height > window.innerHeight - padding) {
      position.top = window.innerHeight - height - padding
    }
    
    return position
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
  async setUISelections(selections = {}) {
    const { useUIStore } = await import('@/stores/useUIStore')
    const uiStore = useUIStore()
    
    // Apply all selections
    if (selections.product !== undefined) uiStore.selectedProduct = selections.product
    if (selections.country !== undefined) uiStore.selectedCountry = selections.country
    if (selections.metric !== undefined) uiStore.selectedMetric = selections.metric
    if (selections.year !== undefined) uiStore.selectedYear = selections.year
    
    // Wait for all reactive updates
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Validate selections were applied
    const finalState = {
      product: uiStore.selectedProduct,
      country: uiStore.selectedCountry,
      metric: uiStore.selectedMetric,
      year: uiStore.selectedYear
    }
    
    console.log('[TourService] UI selections applied:', finalState)
    return finalState
  }
}

// Export singleton instance
export default new TourService()