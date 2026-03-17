/**
 * auth.cy.js
 * Tests E2E — Authentification et compte utilisateur
 * cartes.gouv.fr (via AgentConnect / France Connect)
 */

describe('Authentification', () => {
  // ─── Page de connexion ─────────────────────────────────────────
  describe('Accès à la page de connexion', () => {
    beforeEach(() => {
      cy.visit('/')
    })

    it('affiche un bouton / lien de connexion', () => {
      cy.get('[data-testid="login-btn"], [aria-label*="connexion"], a[href*="login"], a[href*="connexion"]')
        .should('exist')
        .and('be.visible')
    })

    it('redirige vers la page de connexion au clic', () => {
      cy.get('[data-testid="login-btn"], [aria-label*="connexion"], a[href*="login"]')
        .first()
        .click()
      cy.url().should('match', /login|connexion|authenticate|agent-connect|france-connect/i)
    })
  })

  // ─── Formulaire de connexion ───────────────────────────────────
  describe('Formulaire de connexion', () => {
    beforeEach(() => {
      cy.visit('/login', { failOnStatusCode: false })
    })

    it('affiche un champ email ou identifiant', () => {
      cy.get('input[type="email"], input[name*="email"], input[name*="login"], input[id*="email"]')
        .should('exist')
        .and('be.visible')
    })

    it('affiche un champ mot de passe', () => {
      cy.get('input[type="password"]').should('exist').and('be.visible')
    })

    it('affiche le bouton de soumission', () => {
      cy.get('button[type="submit"], input[type="submit"], [data-testid="submit-login"]')
        .should('exist')
        .and('be.visible')
    })

    it('affiche une erreur si les champs sont vides', () => {
      cy.get('button[type="submit"], input[type="submit"]').first().click()
      cy.get('[aria-live="polite"], [role="alert"], .error, [data-testid="login-error"]')
        .should('exist')
    })

    it('affiche une erreur avec des identifiants invalides', () => {
      cy.get('input[type="email"], input[name*="email"], input[name*="login"]')
        .first()
        .type('utilisateur_invalide@test.fr')
      cy.get('input[type="password"]').type('mauvais_mot_de_passe')
      cy.get('button[type="submit"], input[type="submit"]').first().click()
      cy.get('[aria-live="polite"], [role="alert"], .error, [data-testid="login-error"]')
        .should('exist')
    })

    it('le mot de passe peut être masqué / affiché', () => {
      cy.get('input[type="password"]').as('pwd')
      cy.get('[aria-label*="afficher"], [aria-label*="show"], [data-testid="toggle-password"]')
        .first()
        .click()
      cy.get('@pwd').should('have.attr', 'type', 'text')
    })
  })

  // ─── AgentConnect / FranceConnect ─────────────────────────────
  describe('Connexion via fournisseur d\'identité', () => {
    beforeEach(() => {
      cy.visit('/')
    })

    it('propose AgentConnect ou FranceConnect comme option de connexion', () => {
      cy.get('[data-testid="login-btn"], a[href*="login"], a[href*="connexion"]').first().click()
      cy.get(
        'a[href*="agent-connect"], button[data-provider="agentconnect"], ' +
        'a[href*="france-connect"], img[alt*="AgentConnect"], img[alt*="FranceConnect"]'
      ).should('exist')
    })

    it('intercepte la requête de redirection vers AgentConnect', () => {
      cy.intercept('GET', '**/agent-connect/**').as('agentConnect')
      cy.get('[data-testid="login-btn"], a[href*="login"]').first().click()
      cy.get('a[href*="agent-connect"], button[data-provider="agentconnect"]').first().click({ force: true })
      // On vérifie que la requête part (sans suivre la redirection externe)
      cy.wait('@agentConnect', { timeout: 10000 }).its('request.url').should('include', 'agent-connect')
    })
  })

  // ─── Compte connecté (stub de session) ────────────────────────
  describe('Espace utilisateur connecté', () => {
    beforeEach(() => {
      // Injecter un cookie / token de session factice pour simuler la connexion
      cy.setCookie('session', 'fake-valid-session-token')
      cy.intercept('GET', '**/api/me', {
        statusCode: 200,
        body: { id: '1', email: 'agent@test.gouv.fr', prenom: 'Jean', nom: 'Dupont' }
      }).as('getMe')
      cy.visit('/')
    })

    it('affiche le nom de l\'utilisateur connecté', () => {
      cy.wait('@getMe')
      cy.get('[data-testid="user-menu"], [aria-label*="compte"], [aria-label*="profil"]')
        .should('contain.text', 'Jean')
        .or('be.visible')
    })

    it('affiche le menu du compte utilisateur', () => {
      cy.wait('@getMe')
      cy.get('[data-testid="user-menu"], [aria-label*="compte"]').first().click()
      cy.get('[data-testid="user-dropdown"], [role="menu"]').should('be.visible')
    })

    it('permet de se déconnecter', () => {
      cy.wait('@getMe')
      cy.get('[data-testid="user-menu"], [aria-label*="compte"]').first().click()
      cy.get('[data-testid="logout-btn"], [href*="logout"], [href*="deconnexion"], button[aria-label*="déconnexion"]')
        .should('exist')
        .click({ force: true })
      cy.url().should('not.include', '/compte')
    })
  })
})
