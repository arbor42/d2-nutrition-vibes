describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForApp()
    cy.injectAxe()
  })

  it('should have no accessibility violations on homepage', () => {
    cy.checkA11y()
  })

  it('should have no accessibility violations on timeseries panel', () => {
    cy.navigateToPanel('timeseries')
    cy.checkA11y()
  })

  it('should have no accessibility violations on ML panel', () => {
    cy.navigateToPanel('ml')
    cy.checkA11y()
  })

  it('should have proper focus management', () => {
    // Test keyboard navigation
    cy.get('body').tab()
    cy.focused().should('have.attr', 'data-testid').and('match', /nav|button|link/)
    
    // Test that focus is visible
    cy.focused().should('have.css', 'outline-width').and('not.eq', '0px')
  })

  it('should have proper ARIA labels on interactive elements', () => {
    cy.navigateToPanel('ml')
    
    // Check buttons have proper labels
    cy.get('button').each(($btn) => {
      cy.wrap($btn).should('satisfy', ($el) => {
        return $el.attr('aria-label') || $el.text().trim() || $el.attr('title')
      })
    })
    
    // Check form controls have labels
    cy.get('select, input').each(($input) => {
      cy.wrap($input).should('satisfy', ($el) => {
        const id = $el.attr('id')
        return $el.attr('aria-label') || 
               $el.attr('aria-labelledby') ||
               (id && Cypress.$(`label[for="${id}"]`).length > 0)
      })
    })
  })

  it('should have proper heading hierarchy', () => {
    cy.navigateToPanel('dashboard')
    
    // Check that h1 exists and is unique
    cy.get('h1').should('have.length', 1)
    
    // Check heading order (h2 should follow h1, etc.)
    cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
      const headings = Array.from($headings).map(h => parseInt(h.tagName.charAt(1)))
      
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i]
        const previous = headings[i - 1]
        
        // Next heading should not skip more than one level
        expect(current - previous).to.be.at.most(1)
      }
    })
  })

  it('should provide alternative text for images', () => {
    cy.get('img').each(($img) => {
      cy.wrap($img).should('satisfy', ($el) => {
        return $el.attr('alt') !== undefined
      })
    })
  })

  it('should have sufficient color contrast', () => {
    // Check specific color contrast issues
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })

  it('should be keyboard accessible', () => {
    // Test navigation with keyboard only
    cy.get('body').tab()
    cy.focused().type('{enter}')
    
    // Test that all interactive elements are reachable
    cy.get('button, a, input, select').each(($el) => {
      cy.wrap($el).focus()
      cy.focused().should('have.attr', 'tabindex').and('not.eq', '-1')
    })
  })

  it('should announce dynamic content changes', () => {
    cy.navigateToPanel('ml')
    
    // Check for aria-live regions for dynamic updates
    cy.get('[aria-live="polite"], [aria-live="assertive"]').should('exist')
    
    // Test loading states are announced
    cy.get('[data-testid="load-predictions"]').click()
    cy.get('[aria-live]').should('contain.text', 'lädt')
  })
})