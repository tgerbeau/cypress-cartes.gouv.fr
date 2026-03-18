/**
 * commands.js
 * Commandes Cypress custom — cypress-cartes.gouv.fr
 *
 * Seules les commandes réellement utilisées dans les tests sont conservées.
 */

// ─── Cookies ───────────────────────────────────────────────────────────────────

/**
 * Accepte la bannière de cookies si elle est présente.
 * Usage : cy.acceptCookies()
 */
Cypress.Commands.add('acceptCookies', () => {
  cy.get('body').then(($body) => {
    const btn = $body.find(
      '[data-testid="accept-cookies"], button[aria-label*="accepter"], button[aria-label*="cookies"], .fr-consent-banner button'
    )
    if (btn.length) {
      btn.first().click()
    }
  })
})

// ─── Carte interactive ─────────────────────────────────────────────────────────

/**
 * Ferme la modale d'accueil si elle est présente.
 * Usage : cy.dismissModal()
 */
Cypress.Commands.add('dismissModal', () => {
  cy.get('body').then(($body) => {
    if ($body.find('dialog.fr-modal--opened, .welcome-modal[open]').length) {
      cy.get('body').type('{esc}')
      cy.get('dialog.fr-modal--opened, .welcome-modal[open]').should('not.exist')
    }
  })
})
