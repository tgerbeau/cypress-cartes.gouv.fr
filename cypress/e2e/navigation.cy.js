/**
 * navigation.cy.js
 * Tests E2E — Navigation du menu principal
 * cartes.gouv.fr
 */

describe('Navigation du menu principal', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.document().its('readyState').should('eq', 'complete')
    cy.get('body').should('be.visible')
  })

  it('le menu de navigation principal est visible', () => {
    // Le DSFR utilise nav.fr-nav pour la navigation principale
    cy.get('nav.fr-nav, header nav, [role="navigation"]')
      .first()
      .should('exist')
      .and('be.visible')
  })

  it('les liens du menu principal ont un texte accessible', () => {
    cy.get('nav.fr-nav .fr-nav__link, nav.fr-nav a, [role="navigation"] a')
      .filter(':visible')
      .should('have.length.at.least', 1)
      .each(($link) => {
        const text = $link.text().trim()
        const ariaLabel = ($link.attr('aria-label') || '').trim()
        expect(
          text || ariaLabel,
          `Le lien "${$link.attr('href')}" doit avoir un texte accessible`
        ).to.not.be.empty
      })
  })

  it('chaque lien principal du menu charge correctement la page', () => {
    // Collecter les hrefs des liens internes du menu de navigation
    // Utiliser un sélecteur large couvrant DSFR et navigation générique
    cy.get('nav.fr-nav .fr-nav__link, nav.fr-nav a[href], [role="navigation"] a[href]')
      .filter(':visible')
      .then(($links) => {
        const hrefs = []
        $links.each((_, link) => {
          const href = link.getAttribute('href')
          // Ne conserver que les liens internes non vides et non-ancres
          if (
            href &&
            href !== '#' &&
            href !== '' &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !href.startsWith('javascript:') &&
            !href.startsWith('data:') &&
            !href.startsWith('vbscript:')
          ) {
            hrefs.push(href)
          }
        })

        expect(hrefs.length, 'Le menu doit contenir au moins un lien interne').to.be.at.least(1)

        hrefs.forEach((href) => {
          cy.visit(href, { timeout: 30000 })
          cy.document().its('readyState').should('eq', 'complete')
          cy.get('body').should('be.visible')
          // Vérifier qu'une structure de page valide est présente
          cy.get('h1, main, [role="main"]').should('exist')
        })
      })
  })
})
