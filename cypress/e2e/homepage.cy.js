describe('Homepage Tests', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.document().its('readyState').should('eq', 'complete')
    cy.get('body').should('be.visible')
  })

  it('should load the homepage successfully', () => {
    cy.url().should('include', 'cartes.gouv.fr')

    // Close welcome modal only if present/visible
    cy.get('body').then($body => {
      const closeSelector = '#fr-modal-1 button.fr-btn--icon-right span'
      if ($body.find(closeSelector).length > 0) {
        cy.get(closeSelector).first().click({ force: true })
      }
    })

    // Cookie consent is handled globally via cy.acceptCookies() in support/e2e.js
  })

  it('should display the main title or heading', () => {
    // Update selector based on actual page structure
    cy.get('h1').should('exist')
  })

  it('should have a valid page title', () => {
    cy.title().should('not.be.empty')
  })

  it('should be responsive', () => {
    // Test mobile viewport
    cy.viewport('iphone-x')
    cy.get('body').should('be.visible')
    
    // Test tablet viewport
    cy.viewport('ipad-2')
    cy.get('body').should('be.visible')
    
    // Test desktop viewport
    cy.viewport(1920, 1080)
    cy.get('body').should('be.visible')
  })
})
