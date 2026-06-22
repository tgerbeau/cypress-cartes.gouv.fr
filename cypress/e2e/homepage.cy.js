const routes = require('../fixtures/routes.json')

/**
 * Supprime les slashs de début/fin pour réutiliser un chemin
 * dans les sélecteurs `href*=`.
 */
const pathFragment = (path) => path.replace(/^\/|\/$/g, '')

describe('Homepage Tests', { tags: '@nav' }, () => {
  beforeEach(() => {
    cy.visit(routes.home, { timeout: 120000 })
    cy.document().its('readyState').should('eq', 'complete')
    cy.get('body').should('be.visible')
  })

  it('should load the homepage successfully', { tags: '@smoke' }, () => {
    // Give extra time for the URL to update after the visit on slow connections
    cy.location('href', { timeout: 30000 }).should('include', 'cartes.gouv.fr')

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
    // filter(':visible') évite de sélectionner un heading dans un conteneur masqué (overflow:hidden, height:0)
    cy.get('h1, h2, [class*="fr-display"], [class*="fr-h1"]', { timeout: 10000 })
      .filter(':visible')
      .first()
      .should('exist')
      .and('be.visible')
  })

  it('should have a valid page title', () => {
    cy.title().should('not.be.empty')
  })

  it('propose les accès clés vers explorer et découvrir', () => {
    [routes.explorer, routes.discover].forEach((path) => {
      cy.get(`a[href*="${pathFragment(path)}"]`, { timeout: 10000 })
        .should('have.length.at.least', 1)
    })
  })

  it('un accès visible vers l’explorateur ouvre une page exploitable', () => {
    cy.get(`a[href*="${pathFragment(routes.explorer)}"]`, { timeout: 10000 })
      .filter(':visible')
      .first()
      .click({ force: true })

    cy.location('pathname', { timeout: 30000 }).should('include', pathFragment(routes.explorer))
    cy.get('.ol-viewport, main, [role="main"]', { timeout: 15000 }).should('exist')
  })

  it('le footer expose les liens légaux essentiels', () => {
    cy.get('footer, .fr-footer', { timeout: 15000 }).should('be.visible')

    const legalPaths = [routes.legal, routes.privacy, routes.terms].filter(Boolean)
    expect(legalPaths.length, 'Au moins un lien légal doit être configuré').to.be.greaterThan(0)
    legalPaths.forEach((path) => {
      cy.get(`footer a[href*="${pathFragment(path)}"], .fr-footer a[href*="${pathFragment(path)}"]`)
        .should('have.length.at.least', 1)
    })
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
    // La bannière peut avoir été auto-acceptée par le override cy.visit
    cy.get('body').then(($body) => {
      if ($body.find('.fr-consent-banner').length && $body.find('.fr-consent-banner').is(':visible')) {
        cy.get('.fr-consent-banner').contains('button', 'Tout accepter').click()
        cy.get('.fr-consent-banner').should('not.be.visible')
      } else {
        cy.log('ℹ️ Bannière cookies déjà acceptée par le override cy.visit')
      }
    })
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
    const burgerSelector = '.fr-btn--menu, button[aria-controls*="menu"], button[aria-controls*="modal"], .fr-header__menu-links button, button[aria-label*="menu"], button[aria-label*="Menu"], button[data-fr-opened-false]'
    cy.get(burgerSelector, { timeout: 15000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .click({ force: true })
    cy.get('nav.fr-nav, header nav, [role="navigation"]', { timeout: 10000 })
      .filter(':visible')
      .should('have.length.at.least', 1)
    cy.get(`a[href*="${pathFragment(routes.catalogue)}"], a[href*="${pathFragment(routes.discover)}"]`)
      .should('have.length.at.least', 1)
  })
})
