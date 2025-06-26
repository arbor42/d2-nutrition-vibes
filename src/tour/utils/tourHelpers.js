/**
 * Tour Helper Functions
 * Utility functions to help with tour management across the application
 */

import TourService from '../services/TourService'
import { useTourStore } from '../stores/useTourStore'

/**
 * Start the main tour
 * @param {Object} options - Tour options
 * @returns {Promise<boolean>} Success status
 */
export async function startMainTour(options = {}) {
  try {
    const success = await TourService.startTour('main', options)
    if (success) {
      console.log('[TourHelper] Main tour started successfully')
    }
    return success
  } catch (error) {
    console.error('[TourHelper] Failed to start main tour:', error)
    return false
  }
}

/**
 * Check if the user should see the tour
 * @returns {boolean} Whether to show tour
 */
export function shouldShowTour() {
  const tourStore = useTourStore()
  
  // Don't show if already seen intro
  if (tourStore.hasSeenIntro) {
    return false
  }
  
  // Don't show if tour is already active
  if (tourStore.isActive) {
    return false
  }
  
  // Check URL params for tour flag
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('tour') === 'true') {
    return true
  }
  
  // Check if this is the user's first visit
  const isFirstVisit = !localStorage.getItem('app-visited')
  if (isFirstVisit) {
    localStorage.setItem('app-visited', 'true')
    return true
  }
  
  return false
}

/**
 * Reset tour progress and start fresh
 */
export function resetTour() {
  const tourStore = useTourStore()
  tourStore.resetTourData()
  console.log('[TourHelper] Tour data reset')
}

/**
 * Skip to a specific tour step
 * @param {string} stepId - The ID of the step to skip to
 * @returns {boolean} Success status
 */
export function skipToStep(stepId) {
  const tourStore = useTourStore()
  
  if (!tourStore.isActive || !tourStore.currentTour) {
    console.warn('[TourHelper] No active tour to skip steps in')
    return false
  }
  
  const stepIndex = tourStore.currentTour.steps.findIndex(step => step.id === stepId)
  if (stepIndex === -1) {
    console.warn(`[TourHelper] Step '${stepId}' not found in current tour`)
    return false
  }
  
  return TourService.goToStep(stepIndex)
}

/**
 * Get tour completion statistics
 * @returns {Object} Tour stats
 */
export function getTourStats() {
  const tourStore = useTourStore()
  
  return {
    hasSeenIntro: tourStore.hasSeenIntro,
    completedTours: tourStore.completedTours,
    currentProgress: tourStore.progress,
    isActive: tourStore.isActive,
    currentStep: tourStore.currentStep?.id,
    totalSteps: tourStore.totalSteps
  }
}

/**
 * Add a tour trigger button to any element
 * @param {HTMLElement} element - Element to attach trigger to
 * @param {Object} options - Trigger options
 */
export function addTourTrigger(element, options = {}) {
  if (!element) return
  
  const {
    tourId = 'main',
    stepId = null,
    className = 'tour-trigger',
    tooltip = 'Tour starten'
  } = options
  
  element.classList.add(className)
  element.setAttribute('title', tooltip)
  element.style.cursor = 'pointer'
  
  element.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (stepId) {
      await startMainTour({ startStep: 0 })
      skipToStep(stepId)
    } else {
      await startMainTour()
    }
  })
}

/**
 * Check if a specific tour step has been completed
 * @param {string} stepId - Step ID to check
 * @returns {boolean} Whether step was completed
 */
export function hasCompletedStep(stepId) {
  const tourStore = useTourStore()
  
  if (!tourStore.currentTour) {
    return false
  }
  
  const stepIndex = tourStore.currentTour.steps.findIndex(step => step.id === stepId)
  return stepIndex !== -1 && stepIndex < tourStore.currentStepIndex
}

/**
 * Enable tour debug mode
 */
export function enableTourDebug() {
  localStorage.setItem('tour-debug', 'true')
  console.log('[TourHelper] Debug mode enabled. Press Ctrl+Shift+D to toggle debugger.')
}

/**
 * Disable tour debug mode
 */
export function disableTourDebug() {
  localStorage.removeItem('tour-debug')
  console.log('[TourHelper] Debug mode disabled')
}