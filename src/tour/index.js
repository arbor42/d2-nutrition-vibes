// D2 Nutrition Vibes Tour System Entry Point
import { useTourStore } from './stores/useTourStore'
import TourService from './services/TourService'
import TourOverlay from './components/TourOverlay.vue'

// Tour-System Export
export {
  useTourStore,
  TourService,
  TourOverlay
}

// Initialize Tour System
export const initializeTourSystem = (app) => {
  // Use existing singleton instance
  const tourService = TourService
  
  // Initialize with app context
  tourService.init(app)
  
  // Provide tour service globally
  app.provide('tourService', tourService)
  
  // Global properties for easy access
  app.config.globalProperties.$tour = tourService
  
  return tourService
}

// Tour System Plugin
export default {
  install(app, options = {}) {
    const tourService = initializeTourSystem(app)
    
    // Auto-register Tour Overlay component globally
    app.component('TourOverlay', TourOverlay)
    
    // Initialize tour data if provided
    if (options.tours) {
      tourService.registerTours(options.tours)
    }
    
    // Auto-start tour if configured
    if (options.autoStart && !localStorage.getItem('tour-completed')) {
      tourService.startTour(options.autoStart)
    }
  }
}