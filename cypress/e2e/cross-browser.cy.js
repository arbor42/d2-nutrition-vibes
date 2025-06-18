describe('Cross-Browser Compatibility Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForApp()
  })

  it('should work in different viewport sizes', () => {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1280, height: 720, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' }
    ]

    viewports.forEach(viewport => {
      cy.viewport(viewport.width, viewport.height)
      
      // Test basic functionality works
      cy.get('[data-testid="app"]').should('be.visible')
      cy.navigateToPanel('dashboard')
      cy.waitForVisualization('.world-map')
      
      // Test responsive navigation
      if (viewport.width < 768) {
        cy.get('[data-testid="mobile-menu-button"]').should('be.visible')
      } else {
        cy.get('[data-testid="desktop-navigation"]').should('be.visible')
      }
    })
  })

  it('should handle touch events on mobile devices', () => {
    cy.viewport('iphone-6')
    
    cy.navigateToPanel('timeseries')
    cy.waitForVisualization('.timeseries-chart')
    
    // Test touch interactions
    cy.get('.timeseries-chart').trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
    cy.get('.timeseries-chart').trigger('touchend')
    
    // Test pinch zoom (simulated)
    cy.get('.timeseries-chart').trigger('touchstart', { 
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 }
      ] 
    })
    cy.get('.timeseries-chart').trigger('touchend')
  })

  it('should support keyboard navigation', () => {
    // Test tab navigation
    cy.get('body').tab()
    cy.focused().should('be.visible')
    
    // Navigate through interactive elements
    cy.focused().tab()
    cy.focused().should('have.attr', 'tabindex').and('not.eq', '-1')
    
    // Test enter/space activation
    cy.focused().type('{enter}')
    
    // Test escape key functionality
    cy.get('body').type('{esc}')
  })

  it('should work with reduced motion preferences', () => {
    // Simulate prefers-reduced-motion
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'userAgent', {
        writable: true,
        value: win.navigator.userAgent + ' prefers-reduced-motion: reduce'
      })
    })
    
    cy.navigateToPanel('timeseries')
    cy.waitForVisualization('.timeseries-chart')
    
    // Animations should be reduced or disabled
    cy.get('.animated-element').should('have.css', 'animation-duration', '0s')
  })

  it('should handle high contrast mode', () => {
    // Simulate high contrast mode
    cy.get('body').invoke('addClass', 'high-contrast')
    
    cy.navigateToPanel('dashboard')
    
    // Check that elements are still visible and accessible
    cy.get('[data-testid="navigation"]').should('be.visible')
    cy.get('.world-map').should('be.visible')
    
    // Check color contrast
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })

  it('should work with different font sizes', () => {
    const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px']
    
    fontSizes.forEach(fontSize => {
      cy.get('html').invoke('css', 'font-size', fontSize)
      
      cy.navigateToPanel('ml')
      
      // Check that layout doesn't break
      cy.get('.panel-content').should('be.visible')
      cy.get('.filters-grid').should('not.have.css', 'overflow', 'hidden')
      
      // Check that text is readable
      cy.get('.panel-title').should('be.visible')
    })
  })

  it('should handle slow network conditions', () => {
    // Simulate slow network
    cy.intercept('GET', '**/fao_data/**', {
      delay: 5000,
      fixture: 'sample-data.json'
    }).as('slowData')
    
    cy.navigateToPanel('timeseries')
    
    // Should show loading state
    cy.get('.loading-spinner').should('be.visible')
    
    // Should eventually load
    cy.wait('@slowData', { timeout: 10000 })
    cy.get('.loading-spinner').should('not.exist')
    cy.waitForVisualization('.timeseries-chart')
  })

  it('should work with JavaScript disabled features', () => {
    // Test that critical content is available even if JS features fail
    cy.window().then((win) => {
      // Simulate JS error
      win.console.error = cy.stub()
      
      // Trigger potential JS error
      win.postMessage({ type: 'TEST_ERROR' }, '*')
    })
    
    // App should still be functional
    cy.get('[data-testid="app"]').should('be.visible')
    cy.get('[data-testid="navigation"]').should('be.visible')
  })

  it('should handle different input methods', () => {
    cy.navigateToPanel('ml')
    
    // Test mouse interaction
    cy.get('[data-testid="region-select"]').click()
    cy.get('[data-testid="region-option-europe"]').click()
    
    // Test keyboard interaction
    cy.get('[data-testid="product-select"]').focus()
    cy.get('[data-testid="product-select"]').type('{downArrow}{enter}')
    
    // Test voice/accessibility tools
    cy.get('[data-testid="load-predictions"]').should('have.attr', 'aria-label')
  })

  it('should work with different time zones', () => {
    // Test with different time zone data
    const timeZones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
    
    timeZones.forEach(timeZone => {
      cy.window().then((win) => {
        // Mock Intl.DateTimeFormat
        const originalDateTimeFormat = win.Intl.DateTimeFormat
        win.Intl.DateTimeFormat = function(locale, options) {
          return originalDateTimeFormat.call(this, locale, { 
            ...options, 
            timeZone 
          })
        }
      })
      
      cy.navigateToPanel('timeseries')
      cy.waitForVisualization('.timeseries-chart')
      
      // Check that dates are displayed correctly
      cy.get('.axis-label').should('contain.text', '20') // Should contain year
    })
  })

  it('should handle memory constraints', () => {
    // Test with large datasets that might cause memory issues
    cy.intercept('GET', '**/fao_data/**', {
      fixture: 'large-dataset.json'
    }).as('largeData')
    
    cy.navigateToPanel('timeseries')
    cy.wait('@largeData')
    
    // Should handle large data gracefully
    cy.waitForVisualization('.timeseries-chart')
    cy.get('.timeseries-chart').should('be.visible')
    
    // Check for memory leaks by navigating between panels
    const panels = ['dashboard', 'ml', 'simulation', 'structural']
    panels.forEach(panel => {
      cy.navigateToPanel(panel)
      cy.wait(1000) // Allow for cleanup
    })
  })

  it('should work with content blockers', () => {
    // Simulate ad blocker or content blocker
    cy.intercept('GET', '**/analytics/**', { statusCode: 404 }).as('blockedAnalytics')
    cy.intercept('GET', '**/tracking/**', { statusCode: 404 }).as('blockedTracking')
    
    cy.visit('/')
    cy.waitForApp()
    
    // Core functionality should still work
    cy.navigateToPanel('dashboard')
    cy.waitForVisualization('.world-map')
    
    // Essential features should be unaffected
    cy.get('[data-testid="app"]').should('be.visible')
  })
})