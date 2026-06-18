// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-axe'

// Simple tag-based test filtering (replaces @cypress/grep)
// Supports tags on both describe() and it() levels
;(function registerGrepTags() {
  const grepTags = Cypress.env('grepTags')
  if (!grepTags) return

  const _it = it
  const _describe = describe
  const suiteTagStack = []

  describe = function grepDescribe(name, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    let tags = options && options.tags
    if (typeof tags === 'string') tags = [tags]
    suiteTagStack.push(tags || [])
    _describe(name, options, callback)
    suiteTagStack.pop()
  }
  describe.skip = _describe.skip
  describe.only = _describe.only

  it = function grepIt(name, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    if (!callback) return _it(name, options)
    let tags = options && options.tags
    if (typeof tags === 'string') tags = [tags]
    const allTags = suiteTagStack.flat().concat(tags || [])
    if (allTags.includes(grepTags)) {
      return _it(name, options, callback)
    }
    return _it.skip(name, options, callback)
  }
  it.skip = _it.skip
  it.only = _it.only
  if (_it.retries) it.retries = _it.retries
})()

// Automatically accept cookies after every page visit
beforeEach(() => {
  // Once the page has loaded, wait briefly for the cookie banner
  // to render, then accept cookies if the banner is present.
  cy.once('window:load', () => {
    setTimeout(() => {
      const btn = document.querySelector('button')
      // This is a best-effort click from inside the browser context
    }, 1500)
  })
})

afterEach(() => {
  // Cleanup if needed
})

// Override cy.visit to accept cookies and dismiss welcome modal
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  originalFn(url, options)
  cy.document().then((doc) => {
    const btn = doc.querySelector(
      '[data-testid="accept-cookies"], button[aria-label*="accepter"], .fr-consent-banner button'
    )
    if (btn) {
      btn.click()
    }
  })
  // Fermer la popup "Bienvenue sur cartes.gouv.fr" si elle apparaît
  // Sur les pages carte/explorateur, la modale peut mettre du temps à apparaître (SPA)
  cy.get('body').then(($body) => {
    if ($body.find('dialog.welcome-modal[open], .fr-modal--opened').length) {
      // Presser Échap — méthode la plus fiable pour fermer les modales DSFR
      cy.get('body').type('{esc}')
      cy.get('dialog.welcome-modal[open], .fr-modal--opened', { timeout: 5000 }).should('not.exist')
    }
  })
})
