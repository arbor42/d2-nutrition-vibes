describe('Data Visualization Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForApp()
  })

  it('should render world map visualization', () => {
    cy.navigateToPanel('dashboard')
    cy.waitForVisualization('.world-map')
    
    // Check that SVG elements exist
    cy.get('.world-map svg').should('exist')
    cy.get('.world-map svg path').should('have.length.greaterThan', 0)
  })

  it('should render timeseries chart', () => {
    cy.navigateToPanel('timeseries')
    cy.waitForVisualization('.timeseries-chart')
    
    // Check chart elements
    cy.get('.timeseries-chart svg').should('exist')
    cy.get('.timeseries-chart .axis').should('have.length', 2) // x and y axis
    cy.get('.timeseries-chart .line').should('exist')
  })

  it('should handle interactive features', () => {
    cy.navigateToPanel('timeseries')
    cy.waitForVisualization('.timeseries-chart')
    
    // Test hover interactions
    cy.interactWithVisualization('hover', '.timeseries-chart')
    cy.get('.tooltip').should('be.visible')
    
    // Test click interactions
    cy.interactWithVisualization('click', '.timeseries-chart')
    // Verify that click handlers work (could check for modal, selection, etc.)
  })

  it('should update visualization when filters change', () => {
    cy.navigateToPanel('ml')
    cy.waitForVisualization()
    
    // Change region filter
    cy.get('[data-testid="region-select"]').click()
    cy.get('[data-testid="region-option-africa"]').click()
    
    // Wait for visualization to update
    cy.get('.loading-spinner').should('be.visible')
    cy.get('.loading-spinner').should('not.exist')
    
    // Verify chart has updated (check for new data)
    cy.waitForVisualization('.ml-chart')
  })

  it('should handle visualization errors gracefully', () => {
    // Intercept API calls and return error
    cy.intercept('GET', '**/fao_data/**', { statusCode: 500 }).as('dataError')
    
    cy.navigateToPanel('timeseries')
    cy.wait('@dataError')
    
    // Check that error is displayed
    cy.get('[data-testid="error-display"]').should('be.visible')
    cy.get('[data-testid="error-display"]').should('contain', 'Fehler')
    
    // Check that retry button works
    cy.get('[data-testid="retry-button"]').should('be.visible')
  })

  it('should be responsive across different screen sizes', () => {
    cy.navigateToPanel('dashboard')
    cy.waitForVisualization('.world-map')
    
    // Test different viewports
    cy.testResponsive(['mobile', 'tablet', 'desktop'])
    
    // Verify visualization adapts to different sizes
    cy.viewport(375, 667) // Mobile
    cy.get('.world-map svg').should('have.attr', 'width').and('match', /^(375|100%)$/)
    
    cy.viewport(1280, 720) // Desktop
    cy.get('.world-map svg').should('have.attr', 'width').and('match', /^(800|100%)$/)
  })
})