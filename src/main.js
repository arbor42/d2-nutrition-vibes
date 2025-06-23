import { createApp } from 'vue'
import { createPinia } from 'pinia'

import router from './router'
import App from './App.vue'
import './assets/styles/tailwind.css'

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
app.mount('#app')