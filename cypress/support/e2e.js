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

// Override cy.visit to accept cookies after each navigation
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
})
