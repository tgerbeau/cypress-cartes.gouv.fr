describe('Homepage Tests', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.document().its('readyState').should('eq', 'complete')
    cy.get('body').should('be.visible')
  })

  it('should load the homepage successfully', { tags: '@smoke' }, () => {
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

  it('should display the main title or heading', { tags: '@smoke' }, () => {
    // La homepage peut utiliser h1, h2 ou un titre dans un composant DSFR
    cy.get('h1, h2, [class*="fr-display"], [class*="fr-h1"]', { timeout: 10000 })
      .first()
      .should('exist')
      .and('be.visible')
  })

  it('should have a valid page title', () => {
    cy.title().should('not.be.empty')
  })

  it('la popup cookies s\'affiche et le bouton "Tout accepter" fonctionne', () => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/', {
      timeout: 120000,
      onBeforeLoad(win) {
        win.localStorage.clear()
      },
    })
    // La bannière DSFR de consentement doit apparaître
    cy.get('.fr-consent-banner', { timeout: 10000 }).should('be.visible')
    // Cliquer sur "Tout accepter"
    cy.get('.fr-consent-banner').contains('button', 'Tout accepter').click()
    // La bannière doit disparaître après acceptation
    cy.get('.fr-consent-banner').should('not.exist')
  })

  it('should show mobile navigation on small viewports', () => {
    cy.viewport(375, 667)
    // Fermer la modale si présente après resize
    cy.get('body').then(($body) => {
      if ($body.find('dialog.fr-modal--opened, .welcome-modal[open]').length) {
        cy.get('body').type('{esc}')
      }
    })
    // Le DSFR affiche un bouton burger sur mobile
    cy.get('.fr-btn--menu, button[data-fr-opened], .fr-header__menu-links button', { timeout: 5000 })
      .should('be.visible')
  })
})
