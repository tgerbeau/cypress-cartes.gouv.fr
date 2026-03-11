describe('Search Functionality', () => {
  const searchInputSelector = [
    'input[type="search"]:visible',
    'input[aria-label*="Recher"]:visible',
    'input[aria-label*="recher"]:visible',
    'input[type="text"]:visible'
  ].join(', ')

  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')

    // Poll until the welcome modal is gone or dismissed
    const dismissModal = () => {
      cy.document().then(doc => {
        const modal = doc.querySelector('#fr-modal-1.fr-modal--opened')
        if (modal) {
          const closeBtn = modal.querySelector('button.fr-btn--icon-right') ||
                           modal.querySelector('button[aria-label*="Fermer"]')
          if (closeBtn) closeBtn.click()
          // Re-check after a short wait
          cy.wait(1000)
          cy.document().then(doc2 => {
            if (doc2.querySelector('#fr-modal-1.fr-modal--opened')) {
              dismissModal()
            }
          })
        }
      })
    }

    // Give the app time to render the modal
    cy.wait(5000)
    dismissModal()
    // Ensure no modal is blocking
    cy.wait(500)
  })

  it('should have a search input field', () => {
    cy.get(searchInputSelector)
      .filter(':enabled')
      .first()
      .should('exist')
      .and('be.visible')
  })

  it('should allow typing in search field', () => {
    cy.prompt([
      'Find the search input at the top of the map and type "Paris" into it.'
    ])

    cy.get(searchInputSelector)
      .filter(':enabled')
      .first()
      .should('have.value', 'Paris')
  })

  it('should display search results or suggestions', () => {
    cy.prompt([
      'Find the search input at the top of the map and type "Paris" into it.'
    ])

    cy.get(searchInputSelector)
      .filter(':enabled')
      .first()
      .should('have.value', 'Paris')

    cy.contains(/paris/i, { timeout: 15000 }).should('exist')
  })
})
