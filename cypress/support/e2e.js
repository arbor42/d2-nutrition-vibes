// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-axe'
import '@percy/cypress'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests in command log
Cypress.on('window:before:load', (win) => {
  const origFetch = win.fetch
  win.fetch = (...args) => {
    if (args[0].includes('/api/')) {
      // Log API calls but don't clutter the command log
      cy.log(`API Call: ${args[0]}`)
    }
    return origFetch.apply(win, args)
  }
})

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Don't fail tests on unhandled D3.js errors or Vue warnings
  if (err.message.includes('ResizeObserver') || 
      err.message.includes('Vue warn') ||
      err.message.includes('Non-passive event listener')) {
    return false
  }
  // We still want to ensure there are no other unexpected errors
  return true
})