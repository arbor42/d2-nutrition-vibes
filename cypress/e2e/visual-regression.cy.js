describe('Visual Regression Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForApp()
  })

  it('should capture homepage layout', () => {
    cy.get('[data-testid="app"]').should('be.visible')
    cy.percy('Homepage')
  })

  it('should capture dashboard panel', () => {
    cy.navigateToPanel('dashboard')
    cy.waitForVisualization('.world-map')
    cy.percy('Dashboard Panel')
  })

  it('should capture timeseries panel', () => {
    cy.navigateToPanel('timeseries')
    cy.waitForVisualization('.timeseries-chart')
    cy.percy('Timeseries Panel')
  })

  it('should capture ML panel with predictions', () => {
    cy.navigateToPanel('ml')
    cy.get('[data-testid="load-predictions"]').click()
    cy.waitForVisualization('.ml-chart')
    cy.percy('ML Panel - With Predictions')
  })

  it('should capture simulation panel', () => {
    cy.navigateToPanel('simulation')
    cy.get('[data-testid="run-simulation"]').click()
    cy.get('.simulation-results').should('be.visible')
    cy.percy('Simulation Panel - With Results')
  })

  it('should capture structural analysis panel', () => {
    cy.navigateToPanel('structural')
    cy.get('[data-testid="run-analysis"]').click()
    cy.waitForVisualization('.network-visualization')
    cy.percy('Structural Panel - Network View')
  })

  it('should capture process mining panel', () => {
    cy.navigateToPanel('process')
    cy.get('[data-testid="discover-processes"]').click()
    cy.waitForVisualization('.process-visualization')
    cy.percy('Process Panel - Discovery View')
  })

  it('should capture mobile layouts', () => {
    cy.viewport('iphone-6')
    
    // Homepage mobile
    cy.percy('Homepage - Mobile')
    
    // Dashboard mobile
    cy.navigateToPanel('dashboard')
    cy.waitForVisualization('.world-map')
    cy.percy('Dashboard Panel - Mobile')
    
    // ML panel mobile
    cy.navigateToPanel('ml')
    cy.percy('ML Panel - Mobile')
  })

  it('should capture tablet layouts', () => {
    cy.viewport('ipad-2')
    
    // Dashboard tablet
    cy.navigateToPanel('dashboard')
    cy.waitForVisualization('.world-map')
    cy.percy('Dashboard Panel - Tablet')
    
    // Timeseries tablet
    cy.navigateToPanel('timeseries')
    cy.waitForVisualization('.timeseries-chart')
    cy.percy('Timeseries Panel - Tablet')
  })

  it('should capture error states', () => {
    // Intercept API calls and return error
    cy.intercept('GET', '**/fao_data/**', { statusCode: 500 }).as('dataError')
    
    cy.navigateToPanel('timeseries')
    cy.wait('@dataError')
    
    cy.get('[data-testid="error-display"]').should('be.visible')
    cy.percy('Error State - Data Loading Failed')
  })

  it('should capture loading states', () => {
    // Intercept API calls with delay
    cy.intercept('GET', '**/fao_data/**', { 
      delay: 2000,
      fixture: 'sample-data.json' 
    }).as('delayedData')
    
    cy.navigateToPanel('timeseries')
    cy.get('.loading-spinner').should('be.visible')
    cy.percy('Loading State - Data Loading')
  })

  it('should capture dark mode (if implemented)', () => {
    // Toggle dark mode if available
    cy.get('[data-testid="theme-toggle"]').then(($toggle) => {
      if ($toggle.length > 0) {
        cy.wrap($toggle).click()
        cy.get('body').should('have.class', 'dark')
        cy.percy('Dashboard Panel - Dark Mode')
      }
    })
  })

  it('should capture component interactions', () => {
    cy.navigateToPanel('ml')
    
    // Capture initial state
    cy.percy('ML Panel - Initial State')
    
    // Change filters and capture
    cy.get('[data-testid="region-select"]').click()
    cy.get('[data-testid="region-option-africa"]').click()
    cy.percy('ML Panel - Africa Selected')
    
    // Load predictions and capture
    cy.get('[data-testid="load-predictions"]').click()
    cy.waitForVisualization('.ml-chart')
    cy.percy('ML Panel - Africa Predictions')
  })

  it('should capture visualization tooltips', () => {
    cy.navigateToPanel('timeseries')
    cy.waitForVisualization('.timeseries-chart')
    
    // Hover to show tooltip
    cy.get('.timeseries-chart .interactive-element').first().trigger('mouseover')
    cy.get('.tooltip').should('be.visible')
    cy.percy('Timeseries - With Tooltip')
  })
})