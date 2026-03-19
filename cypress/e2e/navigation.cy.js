describe('Navigation du menu principal', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.document().its('readyState').should('eq', 'complete')
    cy.get('body').should('be.visible')

    // Fermer la modale d'accueil si présente
    cy.get('body').then(($body) => {
      if ($body.find('dialog.fr-modal--opened, .welcome-modal[open]').length) {
        cy.get('body').type('{esc}')
      }
    })
  })

  it('should display the main navigation menu', () => {
    cy.get('nav, [role="navigation"]', { timeout: 10000 }).should('exist')
    cy.get('.fr-nav, nav.fr-nav, [role="navigation"]', { timeout: 10000 }).should('be.visible')
  })

  it('should have navigation links in the main menu', () => {
    cy.get('.fr-nav__link, .fr-nav a, nav a', { timeout: 10000 })
      .should('have.length.at.least', 1)
  })

  it('should load a new page when clicking each main navigation link', () => {
    cy.get('.fr-nav__link, .fr-nav a', { timeout: 10000 }).then(($links) => {
      // Collecter les hrefs des liens principaux (hors ancres et liens externes)
      const hrefs = []
      $links.each((_, el) => {
        const href = Cypress.$(el).attr('href') || ''
        if (
          href &&
          href !== '#' &&
          !href.startsWith('http') &&
          !hrefs.includes(href)
        ) {
          hrefs.push(href)
        }
      })

      cy.log(`Liens de navigation trouvés : ${hrefs.length}`)

      // Visiter chaque lien et vérifier le chargement de la page
      hrefs.forEach((href) => {
        cy.visit(href, { timeout: 120000 })
        cy.document().its('readyState').should('eq', 'complete')
        cy.get('body').should('be.visible')
        cy.url().should('include', 'cartes.gouv.fr')
      })
    })
  })

  it('should navigate back to homepage from nav links', () => {
    // Vérifier qu'on peut naviguer vers la page d'accueil via le logo ou le lien dédié
    cy.get('a[href="/"], a[href="https://cartes.gouv.fr"], .fr-header__brand a', { timeout: 10000 })
      .first()
      .should('be.visible')
      .click()
    cy.document().its('readyState').should('eq', 'complete')
    cy.url().should('match', /cartes\.gouv\.fr\/?$/)
  })

  it('should show navigation on mobile viewport', () => {
    cy.viewport(375, 667)
    // Sur mobile, le menu principal est accessible via le bouton burger DSFR
    cy.get('.fr-btn--menu, button[data-fr-opened], .fr-header__menu-links button', { timeout: 10000 })
      .should('be.visible')
  })
})
