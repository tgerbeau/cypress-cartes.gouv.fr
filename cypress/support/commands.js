// ***********************************************
// Custom commands for cartes.gouv.fr E2E tests
// https://on.cypress.io/custom-commands
// ***********************************************

/**
 * Accept cookies by clicking the "Tout accepter" button
 * on the cookie consent banner, if it is present.
 */
Cypress.Commands.add('acceptCookies', () => {
  cy.get('body').then($body => {
    // Look for the "Tout accepter" button in the cookie consent banner
    const toutAccepterBtn = $body.find('button').filter(function () {
      return /Tout accepter/i.test(this.textContent)
    })

    if (toutAccepterBtn.length > 0) {
      cy.wrap(toutAccepterBtn.first()).click({ force: true })
    }
  })
})
