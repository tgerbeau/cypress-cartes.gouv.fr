/**
 * commands.js
 * Commandes Cypress custom — cypress-cartes.gouv.fr
 *
 * Seules les commandes réellement utilisées dans les tests sont conservées.
 */

const COOKIE_ACCEPT_SELECTOR =
  '[data-testid="accept-cookies"], button[aria-label*="accepter"], button[aria-label*="cookies"], .fr-consent-banner button'
const WELCOME_MODAL_SELECTOR = 'dialog.fr-modal--opened, dialog.welcome-modal[open], .fr-modal--opened, .welcome-modal[open]'
const LOGIN_TRIGGER_SELECTOR =
  '[data-testid="login-btn"], [aria-label*="connexion"], a[href*="login"], a[href*="connexion"], button[title*="connexion"], a[title*="connexion"]'
const MAP_SEARCH_INPUT_SELECTOR =
  'input.GPsearchInputText, input[role="combobox"][aria-label*="Rechercher"], input[type="search"][aria-label*="Rechercher"], input[type="search"][placeholder*="Rechercher"]'
const PRIMARY_MENU_BUTTON_SELECTOR =
  '.fr-btn--menu, button[aria-controls*="menu"], .fr-header__menu-links button, button[aria-label*="menu"]'

// ─── Cookies ───────────────────────────────────────────────────────────────────

/**
 * Accepte la bannière de cookies si elle est présente.
 * Usage : cy.acceptCookies()
 */
Cypress.Commands.add('acceptCookies', () => {
  cy.get('body').then(($body) => {
    const btn = $body.find(COOKIE_ACCEPT_SELECTOR)
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
    if ($body.find(WELCOME_MODAL_SELECTOR).length) {
      cy.get('body').type('{esc}')
      cy.get(WELCOME_MODAL_SELECTOR).should('not.exist')
    }
  })
})

/**
 * Retourne le premier déclencheur de connexion visible.
 * Usage : cy.getLoginTrigger()
 */
Cypress.Commands.add('getLoginTrigger', () => (
  cy.get(LOGIN_TRIGGER_SELECTOR, { timeout: 15000 })
    .filter(':visible')
    .first()
))

/**
 * Retourne le premier champ de recherche cartographique visible.
 * Usage : cy.getMapSearchInput()
 */
Cypress.Commands.add('getMapSearchInput', () => (
  cy.get(MAP_SEARCH_INPUT_SELECTOR, { timeout: 15000 })
    .filter(':visible')
    .first()
))

/**
 * Retourne le bouton visible d’ouverture du menu principal.
 * Usage : cy.getPrimaryMenuButton()
 */
Cypress.Commands.add('getPrimaryMenuButton', () => (
  cy.get(PRIMARY_MENU_BUTTON_SELECTOR, { timeout: 15000 })
    .filter(':visible')
    .first()
))

Cypress.Commands.add('openPrimaryMenu', () => {
  cy.getPrimaryMenuButton().then(($button) => {
    const expanded = $button.attr('aria-expanded')
    const opened = $button.attr('data-fr-opened')

    if (expanded !== 'true' && opened !== 'true') {
      cy.wrap($button).click({ force: true })
    }
  })
})
