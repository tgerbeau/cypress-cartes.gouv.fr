/**
 * auth.cy.js
 * Tests E2E — Authentification (parcours critique)
 * cartes.gouv.fr → SSO Géoplateforme (sso.geopf.fr)
 */

const auth = require('../fixtures/auth.json')
const routes = require('../fixtures/routes.json')

describe('Authentification — parcours critique', { tags: '@auth' }, () => {
  // ─── Accès à la connexion depuis cartes.gouv.fr ────────────────
  it('affiche un bouton de connexion visible sur la page d\'accueil', () => {
    cy.visit(routes.home)
    cy.getLoginTrigger()
      .should('exist')
      .and('be.visible')
      .then(($trigger) => {
        const accessibleName = [
          $trigger.text().trim(),
          $trigger.attr('aria-label') || '',
          $trigger.attr('title') || '',
        ].join(' ').trim()

        expect(accessibleName).to.not.be.empty
      })
  })

  it('redirige vers le SSO Géoplateforme au clic sur connexion', () => {
    cy.visit(routes.home)
    cy.getLoginTrigger().click({ force: true })
    cy.location('href', { timeout: 30000 }).should('include', 'sso.geopf.fr')
    cy.location('href').should((href) => {
      expect(href).to.match(/cartes\.gouv\.fr|service=|redirect|callback/i)
    })
  })

  // ─── Le SSO est fonctionnel ────────────────────────────────────
  it('la page SSO propose un formulaire de connexion complet', () => {
    cy.visit(routes.home)
    cy.getLoginTrigger().click({ force: true })
    cy.origin('https://sso.geopf.fr', () => {
      cy.get('input[type="text"], input[type="email"], input[name*="username"]').should('exist')
      cy.get('input[type="password"]').should('exist')
      cy.get('button[type="submit"], input[type="submit"]').should('exist')
    })
  })

  it('affiche une erreur avec des identifiants invalides', () => {
    cy.visit(routes.home)
    cy.getLoginTrigger().click({ force: true })

    cy.origin('https://sso.geopf.fr', { args: { invalidUser: auth.invalidUser } }, ({ invalidUser }) => {
      cy.get('input[type="email"], input[type="text"], input[name*="email"], input[name*="username"], input[name*="login"]')
        .first()
        .type(invalidUser.email)
      cy.get('input[type="password"]').type(invalidUser.password)
      cy.get('button[type="submit"], input[type="submit"]').first().click()
      cy.get('[aria-live="polite"], [role="alert"], .alert, .error, .kc-feedback-text, [data-testid="login-error"]', { timeout: 15000 })
        .should('be.visible')
    })
  })

  it('la route de connexion du site reste accessible sans erreur 5xx', () => {
    cy.request({
      url: routes.login,
      failOnStatusCode: false,
      followRedirect: false,
    }).then((response) => {
      expect(response.status).to.be.lessThan(500)
      expect(response.status).to.be.oneOf([200, 301, 302, 303, 307, 308])
    })
  })
})
