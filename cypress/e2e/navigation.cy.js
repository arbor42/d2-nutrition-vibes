describe('Navigation Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForApp()
  })

  it('should load the homepage', () => {
    cy.get('[data-testid="app"]').should('be.visible')
    cy.get('h1').should('contain', 'D2 Nutrition Vibes')
  })

  it('should navigate to all panel routes', () => {
    const panels = ['dashboard', 'timeseries', 'simulation', 'ml', 'structural', 'process']
    
    panels.forEach(panel => {
      cy.navigateToPanel(panel)
      cy.url().should('include', `/${panel}`)
    })
  })

  it('should handle navigation state correctly', () => {
    // Navigate to timeseries panel
    cy.navigateToPanel('timeseries')
    
    // Check that the navigation item is active
    cy.get('[data-testid="nav-timeseries"]').should('have.class', 'active')
    
    // Navigate to another panel
    cy.navigateToPanel('ml')
    
    // Check that previous nav item is no longer active
    cy.get('[data-testid="nav-timeseries"]').should('not.have.class', 'active')
    cy.get('[data-testid="nav-ml"]').should('have.class', 'active')
  })

  it('should maintain responsive navigation on mobile', () => {
    cy.viewport('iphone-6')
    
    // Check if mobile menu exists
    cy.get('[data-testid="mobile-menu-button"]').should('be.visible')
    cy.get('[data-testid="mobile-menu-button"]').click()
    
    // Check that navigation menu is visible
    cy.get('[data-testid="mobile-navigation"]').should('be.visible')
    
    // Navigate using mobile menu
    cy.get('[data-testid="mobile-nav-ml"]').click()
    cy.url().should('include', '/ml')
  })
})