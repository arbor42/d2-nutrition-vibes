import { createApp } from 'vue'
import { createPinia } from 'pinia'

import router from './router'
import App from './App.vue'
import './assets/styles/tailwind.css'
import './tour/styles/tour.css'

// Import tour system
import TourPlugin from './tour'
import { availableTours } from './tour/config/tourSteps'

// URL-State-Service (Phase 2)
import UrlStateService from '@/services/urlState'

// Create Pinia store
const pinia = createPinia()

// Create and mount Vue app
const app = createApp(App)

// Vue performance optimizations
app.config.performance = true

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  console.error('Vue Error:', error)
  console.error('Component:', instance)
  console.error('Error Info:', info)
  
  // Send to error reporting service in production
  // @ts-ignore – Vite import.meta.env Typing nicht in JS-Dateien
  if (import.meta.env.PROD) {
    // TODO: Implement error reporting service
    console.error('Production error:', { error: error.message, stack: error.stack, info })
  }
}

// Global warning handler
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue Warning:', msg)
  if (instance) {
    console.warn('Component:', instance)
  }
  console.warn('Trace:', trace)
}

app.use(router)
app.use(pinia)

// Initialize tour system
app.use(TourPlugin, {
  tours: availableTours,
  autoStart: false // Don't auto-start tour
})

// UrlStateService initialisieren & Resolver übergeben
UrlStateService.init(router)

// Wrapped Resolver, der nach Ausführung automatisch die URL-Anwendung triggert
const readyResolver = UrlStateService.setReadyResolver(() => {})

// Warten bis Router bereit ist, dann Resolver ausführen und App mounten
router.isReady().then(() => {
  readyResolver()
  app.mount('#app')
})