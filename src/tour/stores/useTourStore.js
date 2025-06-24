import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useTourStore = defineStore('tour', () => {
  // Tour-Status
  const isActive = ref(false)
  const currentTourId = ref(null)
  const currentStepIndex = ref(0)
  const totalSteps = ref(0)
  const isPaused = ref(false)
  const isLoading = ref(false)
  
  // Tour-Daten
  const availableTours = ref([])
  const currentTour = ref(null)
  const currentStep = ref(null)
  const stepHistory = ref([])
  
  // UI-State
  const overlayVisible = ref(false)
  const tooltipVisible = ref(false)
  const highlightedElement = ref(null)
  const tooltipPosition = ref({ top: 0, left: 0 })
  const spotlightBounds = ref(null)
  
  // Neue Tooltip-Positionierungs-States
  const tooltipDimensions = ref({ width: 400, height: 'auto' })
  const tooltipConstraints = ref({ 
    minWidth: 300, 
    maxWidth: 600, 
    minHeight: 200,
    maxHeight: 500 
  })
  const floatingMode = ref(false) // Wenn keine Position ohne Überlappung möglich
  const positioningMetadata = ref(null) // Debug-Informationen zur letzten Positionierung
  
  // User-Präferenzen (persistent)
  const hasSeenIntro = ref(localStorage.getItem('tour-seen-intro') === 'true')
  const completedTours = ref(JSON.parse(localStorage.getItem('tour-completed') || '[]'))
  const skipAnimations = ref(localStorage.getItem('tour-skip-animations') === 'true')
  const userPreferences = ref(JSON.parse(localStorage.getItem('tour-preferences') || '{}'))
  
  // Computed Properties
  const progress = computed(() => 
    totalSteps.value ? ((currentStepIndex.value + 1) / totalSteps.value) * 100 : 0
  )
  
  const canGoPrevious = computed(() => 
    currentStepIndex.value > 0 && !isLoading.value
  )
  
  const canGoNext = computed(() => 
    currentStepIndex.value < totalSteps.value - 1 && !isLoading.value
  )
  
  const isLastStep = computed(() => 
    currentStepIndex.value === totalSteps.value - 1
  )
  
  const isFirstStep = computed(() => 
    currentStepIndex.value === 0
  )
  
  const hasCompletedCurrentTour = computed(() => 
    currentTourId.value && completedTours.value.includes(currentTourId.value)
  )
  
  // Actions
  const startTour = (tourId, options = {}) => {
    const tour = availableTours.value.find(t => t.id === tourId)
    if (!tour) {
      console.error(`Tour with id '${tourId}' not found`)
      return false
    }
    
    currentTourId.value = tourId
    currentTour.value = tour
    totalSteps.value = tour.steps.length
    currentStepIndex.value = options.startStep || 0
    currentStep.value = tour.steps[currentStepIndex.value]
    
    isActive.value = true
    overlayVisible.value = true
    tooltipVisible.value = true
    isPaused.value = false
    stepHistory.value = []
    
    // Track tour start
    trackEvent('tour_started', { tourId, totalSteps: totalSteps.value })
    
    return true
  }
  
  const stopTour = (reason = 'user_action') => {
    // Track tour completion/exit
    const completionRate = progress.value
    trackEvent('tour_stopped', { 
      tourId: currentTourId.value, 
      completionRate,
      reason,
      stepIndex: currentStepIndex.value
    })
    
    // Mark as completed if finished
    if (reason === 'completed' && currentTourId.value) {
      markTourCompleted(currentTourId.value)
    }
    
    // Reset state
    isActive.value = false
    overlayVisible.value = false
    tooltipVisible.value = false
    currentTourId.value = null
    currentTour.value = null
    currentStep.value = null
    currentStepIndex.value = 0
    totalSteps.value = 0
    highlightedElement.value = null
    spotlightBounds.value = null
    stepHistory.value = []
    isPaused.value = false
    isLoading.value = false
    
    // Reset neue Tooltip-States
    tooltipDimensions.value = { width: 400, height: 'auto' }
    floatingMode.value = false
    positioningMetadata.value = null
  }
  
  const pauseTour = () => {
    isPaused.value = true
    overlayVisible.value = false
    tooltipVisible.value = false
    trackEvent('tour_paused', { tourId: currentTourId.value, stepIndex: currentStepIndex.value })
  }
  
  const resumeTour = () => {
    isPaused.value = false
    overlayVisible.value = true
    tooltipVisible.value = true
    trackEvent('tour_resumed', { tourId: currentTourId.value, stepIndex: currentStepIndex.value })
  }
  
  const goToStep = (stepIndex) => {
    if (stepIndex < 0 || stepIndex >= totalSteps.value) {
      return false
    }
    
    stepHistory.value.push(currentStepIndex.value)
    currentStepIndex.value = stepIndex
    currentStep.value = currentTour.value.steps[stepIndex]
    
    trackEvent('tour_step_changed', { 
      tourId: currentTourId.value, 
      fromStep: stepHistory.value[stepHistory.value.length - 1],
      toStep: stepIndex
    })
    
    return true
  }
  
  const nextStep = () => {
    if (canGoNext.value) {
      return goToStep(currentStepIndex.value + 1)
    } else if (isLastStep.value) {
      stopTour('completed')
      return true
    }
    return false
  }
  
  const previousStep = () => {
    if (canGoPrevious.value) {
      return goToStep(currentStepIndex.value - 1)
    }
    return false
  }
  
  const registerTour = (tour) => {
    const existingIndex = availableTours.value.findIndex(t => t.id === tour.id)
    if (existingIndex >= 0) {
      availableTours.value[existingIndex] = tour
    } else {
      availableTours.value.push(tour)
    }
  }
  
  const setHighlightedElement = (selector, bounds = null) => {
    highlightedElement.value = selector
    spotlightBounds.value = bounds
  }
  
  const setTooltipPosition = (position) => {
    tooltipPosition.value = position
  }
  
  const setTooltipDimensions = (dimensions) => {
    tooltipDimensions.value = dimensions
  }
  
  const setTooltipConstraints = (constraints) => {
    tooltipConstraints.value = { ...tooltipConstraints.value, ...constraints }
  }
  
  const setFloatingMode = (isFloating) => {
    floatingMode.value = isFloating
  }
  
  const setPositioningMetadata = (metadata) => {
    positioningMetadata.value = metadata
  }
  
  const markTourCompleted = (tourId) => {
    if (!completedTours.value.includes(tourId)) {
      completedTours.value.push(tourId)
      localStorage.setItem('tour-completed', JSON.stringify(completedTours.value))
    }
  }
  
  const markIntroSeen = () => {
    hasSeenIntro.value = true
    localStorage.setItem('tour-seen-intro', 'true')
  }
  
  const setUserPreference = (key, value) => {
    userPreferences.value[key] = value
    localStorage.setItem('tour-preferences', JSON.stringify(userPreferences.value))
  }
  
  const setSkipAnimations = (skip) => {
    skipAnimations.value = skip
    localStorage.setItem('tour-skip-animations', skip.toString())
  }
  
  const resetTourData = () => {
    localStorage.removeItem('tour-completed')
    localStorage.removeItem('tour-seen-intro')
    localStorage.removeItem('tour-preferences')
    localStorage.removeItem('tour-skip-animations')
    
    hasSeenIntro.value = false
    completedTours.value = []
    skipAnimations.value = false
    userPreferences.value = {}
  }
  
  // Simple event tracking (can be extended with analytics)
  const trackEvent = (eventName, data = {}) => {
    console.log(`[Tour Analytics] ${eventName}:`, data)
    
    // Extend with real analytics service
    if (window.gtag) {
      window.gtag('event', eventName, {
        custom_parameter_1: data.tourId,
        custom_parameter_2: data.stepIndex
      })
    }
  }
  
  // Watch for step changes to trigger actions
  watch(currentStep, (newStep, oldStep) => {
    if (newStep && newStep !== oldStep) {
      // Execute step-specific actions
      if (newStep.actions?.onEnter) {
        newStep.actions.onEnter()
      }
    }
  })
  
  // Watch for tour completion
  watch(progress, (newProgress) => {
    if (newProgress === 100 && isActive.value) {
      // Auto-complete tour
      setTimeout(() => {
        if (isActive.value) {
          stopTour('completed')
        }
      }, 2000)
    }
  })
  
  return {
    // State
    isActive,
    currentTourId,
    currentStepIndex,
    totalSteps,
    isPaused,
    isLoading,
    availableTours,
    currentTour,
    currentStep,
    stepHistory,
    overlayVisible,
    tooltipVisible,
    highlightedElement,
    tooltipPosition,
    spotlightBounds,
    hasSeenIntro,
    completedTours,
    skipAnimations,
    userPreferences,
    
    // Neue Tooltip-Positionierungs-States
    tooltipDimensions,
    tooltipConstraints,
    floatingMode,
    positioningMetadata,
    
    // Computed
    progress,
    canGoPrevious,
    canGoNext,
    isLastStep,
    isFirstStep,
    hasCompletedCurrentTour,
    
    // Actions
    startTour,
    stopTour,
    pauseTour,
    resumeTour,
    goToStep,
    nextStep,
    previousStep,
    registerTour,
    setHighlightedElement,
    setTooltipPosition,
    setTooltipDimensions,
    setTooltipConstraints,
    setFloatingMode,
    setPositioningMetadata,
    markTourCompleted,
    markIntroSeen,
    setUserPreference,
    setSkipAnimations,
    resetTourData,
    trackEvent
  }
})