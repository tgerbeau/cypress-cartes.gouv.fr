/**
 * auth.cy.js
 * Tests E2E — Authentification (parcours critique)
 * cartes.gouv.fr → SSO Géoplateforme (sso.geopf.fr)
 */

describe('Authentification — parcours critique', { tags: '@auth' }, () => {
  // ─── Accès à la connexion depuis cartes.gouv.fr ────────────────
  it('affiche un bouton de connexion visible sur la page d\'accueil', () => {
    cy.visit('/')
    cy.get('[data-testid="login-btn"], [aria-label*="connexion"], a[href*="login"], a[href*="connexion"]')
      .should('exist')
      .and('be.visible')
  })

  it('redirige vers le SSO Géoplateforme au clic sur connexion', () => {
    cy.visit('/')
    cy.get('[data-testid="login-btn"], [aria-label*="connexion"], a[href*="login"]')
      .first()
      .click()
    cy.url().should('include', 'sso.geopf.fr')
  })

  // ─── Le SSO est fonctionnel ────────────────────────────────────
  it('la page SSO propose un formulaire de connexion complet', () => {
    cy.visit('/')
    cy.get('[data-testid="login-btn"], [aria-label*="connexion"], a[href*="login"]')
      .first()
      .click()
    cy.origin('https://sso.geopf.fr', () => {
      cy.get('input[type="text"], input[type="email"], input[name*="username"]').should('exist')
      cy.get('input[type="password"]').should('exist')
      cy.get('button[type="submit"], input[type="submit"]').should('exist')
    })
  })

  it('affiche une erreur avec des identifiants invalides', () => {
    cy.visit('/login', { failOnStatusCode: false })
    cy.get('input[type="email"], input[type="text"], input[name*="email"], input[name*="username"], input[name*="login"]')
      .first()
      .type('utilisateur_invalide@test.fr')
    cy.get('input[type="password"]').type('mauvais_mot_de_passe')
    cy.get('button[type="submit"], input[type="submit"]').first().click()
    cy.get('[aria-live="polite"], [role="alert"], .alert, .error, .kc-feedback-text, [data-testid="login-error"]')
      .should('exist')
  })
})
