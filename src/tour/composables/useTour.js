import { computed, inject, watch, onMounted, onUnmounted } from 'vue'
import { useTourStore } from '../stores/useTourStore'

export function useTour(panelName = null) {
  const tourStore = useTourStore()
  const tourService = inject('tourService')
  
  // Check if current panel is the active tour panel
  const isCurrentTourPanel = computed(() => {
    if (!tourStore.isActive || !tourStore.currentStep) return false
    
    // Extract panel name from route
    const stepRoute = tourStore.currentStep.route
    if (!stepRoute) return false
    
    const routePanelMap = {
      '/': 'dashboard',
      '/timeseries': 'timeseries',
      '/simulation': 'simulation',
      '/ml-predictions': 'ml',
      '/structural': 'structural',
      '/process-mining': 'process'
    }
    
    const stepPanel = routePanelMap[stepRoute]
    return stepPanel === panelName
  })
  
  // Get current tour step ID if this panel is active
  const currentTourStep = computed(() => {
    return isCurrentTourPanel.value ? tourStore.currentStep?.id : null
  })
  
  // Helper to check if specific step is active
  const isStepActive = (stepId) => {
    return tourStore.isActive && tourStore.currentStep?.id === stepId
  }
  
  // Helper to get step data
  const getStepData = (stepId) => {
    if (!tourStore.currentTour) return null
    return tourStore.currentTour.steps.find(step => step.id === stepId)
  }
  
  // Tour event handlers
  const handleTourHighlight = (elementSelector, options = {}) => {
    if (tourService && tourStore.isActive) {
      tourService.highlightElement(elementSelector, options)
    }
  }
  
  const handleTourAction = (action) => {
    if (!tourService || !tourStore.isActive) return
    
    switch (action.type) {
      case 'selectProduct':
        tourService.setProductSelection(action.payload)
        break
      case 'selectYear':
        tourService.setYearSelection(action.payload)
        break
      case 'selectCountry':
        tourService.setCountrySelection(action.payload)
        break
      case 'selectMetric':
        tourService.setMetricSelection(action.payload)
        break
      case 'custom':
        if (action.handler && typeof action.handler === 'function') {
          action.handler(action.payload)
        }
        break
    }
  }
  
  // Auto-highlight elements when step changes
  watch(currentTourStep, (newStepId) => {
    if (newStepId && isCurrentTourPanel.value) {
      const stepData = getStepData(newStepId)
      if (stepData?.target) {
        // Wait for DOM update
        setTimeout(() => {
          handleTourHighlight(stepData.target, stepData.highlightOptions)
        }, 100)
      }
    }
  })
  
  // Cleanup on unmount
  onUnmounted(() => {
    if (tourService && isCurrentTourPanel.value) {
      tourService.clearHighlights()
    }
  })
  
  return {
    tourStore,
    tourService,
    isCurrentTourPanel,
    currentTourStep,
    isStepActive,
    getStepData,
    handleTourHighlight,
    handleTourAction
  }
}

// Composable for individual tour steps
export function useTourStep(stepId) {
  const tourStore = useTourStore()
  
  const isActive = computed(() => 
    tourStore.isActive && tourStore.currentStep?.id === stepId
  )
  
  const stepData = computed(() => {
    if (!tourStore.currentTour) return null
    return tourStore.currentTour.steps.find(step => step.id === stepId)
  })
  
  return {
    isActive,
    stepData,
    tourStore
  }
}

// Composable for element highlighting
export function useTourHighlight(elementRef, options = {}) {
  const tourStore = useTourStore()
  const tourService = inject('tourService')
  
  const highlight = () => {
    if (!tourService || !elementRef.value) return
    
    const element = elementRef.value
    const rect = element.getBoundingClientRect()
    const padding = options.padding || 8
    
    const bounds = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2)
    }
    
    tourStore.setHighlightedElement(element, bounds)
  }
  
  const clearHighlight = () => {
    if (tourService) {
      tourService.clearHighlights()
    }
  }
  
  return {
    highlight,
    clearHighlight,
    isHighlighted: computed(() => tourStore.highlightedElement === elementRef.value)
  }
}