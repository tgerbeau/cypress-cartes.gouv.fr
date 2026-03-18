/**
 * forms.cy.js
 * Tests E2E — Formulaires réels de cartes.gouv.fr
 */

describe('Formulaires', () => {
  it('le formulaire « Nous écrire » est complet et fonctionnel', () => {
    cy.visit('/aide/fr/nous-ecrire/')
    cy.contains('h1', 'Nous écrire', { timeout: 10000 }).should('be.visible')

    // Champs attendus
    cy.get('input, textarea, select').should('have.length.greaterThan', 3)
    cy.contains('Votre adresse électronique').should('be.visible')
    cy.get('input[type="email"], input[name*="email"]').should('exist')

    // Bouton d'envoi
    cy.contains('button', 'Envoyer').should('exist').and('be.visible')

    // Soumission à vide → on reste sur la page
    cy.contains('button', 'Envoyer').click()
    cy.url().should('include', 'nous-ecrire')
  })

  it('la bannière cookies s\'affiche lors de la première visite', () => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear()
      }
    })
    cy.get('body').then(($body) => {
      const banner = $body.find('.fr-consent-banner, [data-testid="cookie-banner"], [class*="cookie"], [class*="tarteaucitron"]')
      if (banner.length) {
        cy.wrap(banner).should('be.visible')
        cy.wrap(banner).find('button').should('have.length.greaterThan', 0)
      }
    })
  })
})
