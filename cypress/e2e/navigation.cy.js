describe('Navigation Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should navigate through main menu items', () => {
    // Update selectors based on actual navigation structure
    cy.get('nav').should('exist')
  })

  it('should contain navigation links', () => {
    cy.get('a').should('have.length.greaterThan', 0)
  })

  it('should handle page navigation', () => {
    // Example: Test if clicking a link navigates correctly
    cy.get('a').first().then($link => {
      const href = $link.prop('href')
      if (href && !href.includes('mailto:') && !href.includes('tel:')) {
        cy.wrap($link).click()
        cy.url().should('not.equal', Cypress.config('baseUrl') + '/')
      }
    })
  })
})
