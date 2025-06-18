// Custom commands for D2 Nutrition Vibes testing

// Command to wait for Vue app to be fully loaded
Cypress.Commands.add('waitForApp', () => {
  cy.get('[data-testid="app"]', { timeout: 10000 }).should('be.visible')
  cy.get('.loading', { timeout: 10000 }).should('not.exist')
})

// Command to navigate to a specific panel
Cypress.Commands.add('navigateToPanel', (panelName) => {
  cy.get(`[data-testid="nav-${panelName}"]`).click()
  cy.url().should('include', `/${panelName}`)
  cy.get(`[data-testid="${panelName}-panel"]`).should('be.visible')
})

// Command to wait for data visualization to render
Cypress.Commands.add('waitForVisualization', (selector = '.visualization') => {
  cy.get(selector).should('be.visible')
  cy.get(`${selector} svg`).should('exist')
  cy.wait(1000) // Allow time for D3.js animations
})

// Command to test responsive behavior
Cypress.Commands.add('testResponsive', (breakpoints = ['mobile', 'tablet', 'desktop']) => {
  const viewports = {
    mobile: [375, 667],
    tablet: [768, 1024], 
    desktop: [1280, 720]
  }
  
  breakpoints.forEach(breakpoint => {
    const [width, height] = viewports[breakpoint]
    cy.viewport(width, height)
    cy.wait(500) // Allow layout to adjust
  })
})

// Command to check accessibility
Cypress.Commands.add('checkA11y', (selector = null) => {
  if (selector) {
    cy.get(selector).should('be.visible')
  }
  // Basic accessibility checks
  cy.get('button').each(($btn) => {
    cy.wrap($btn).should('have.attr', 'type')
  })
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt')
  })
})

// Command to test data loading states
Cypress.Commands.add('testLoadingStates', () => {
  // Check that loading spinner appears initially
  cy.get('.loading-spinner').should('be.visible')
  
  // Wait for loading to complete
  cy.get('.loading-spinner', { timeout: 10000 }).should('not.exist')
  
  // Verify content is loaded
  cy.get('[data-testid="content"]').should('be.visible')
})

// Command to interact with D3.js visualizations
Cypress.Commands.add('interactWithVisualization', (action, selector = '.visualization') => {
  cy.get(selector).should('be.visible')
  
  switch (action) {
    case 'hover':
      cy.get(`${selector} .interactive-element`).first().trigger('mouseover')
      break
    case 'click':
      cy.get(`${selector} .interactive-element`).first().click()
      break
    case 'zoom':
      cy.get(selector).trigger('wheel', { deltaY: -100 })
      break
  }
})