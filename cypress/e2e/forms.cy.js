/**
 * forms.cy.js
 * Tests E2E — Formulaires et flux métier
 * cartes.gouv.fr
 */

describe('Formulaires et flux métier', () => {
  // ─── Formulaire de contact / signalement ──────────────────────
  describe('Formulaire de contact', () => {
    beforeEach(() => {
      cy.visit('/contact', { failOnStatusCode: false })
    })

    it('affiche le formulaire de contact', () => {
      cy.get('form, [data-testid="contact-form"]').should('exist').and('be.visible')
    })

    it('affiche les champs obligatoires', () => {
      cy.get('input[required], textarea[required], select[required]')
        .should('have.length.greaterThan', 0)
    })

    it('affiche une erreur si soumission avec champs vides', () => {
      cy.get('button[type="submit"], input[type="submit"]').first().click()
      cy.get('[aria-live], [role="alert"], :invalid, .error').should('exist')
    })

    it('remplit et soumet le formulaire avec succès', () => {
      cy.intercept('POST', '**/contact**').as('submitContact')

      cy.get('input[type="email"], input[name*="email"]').first()
        .type('test@test.gouv.fr')

      cy.get('input[name*="nom"], input[name*="name"], input[placeholder*="nom"]').first()
        .type('Agent Test')

      cy.get('textarea, [data-testid="message"]').first()
        .type('Ceci est un message de test automatisé Cypress.')

      cy.get('button[type="submit"], input[type="submit"]').first().click()

      cy.wait('@submitContact', { timeout: 10000 }).its('response.statusCode')
        .should('be.oneOf', [200, 201, 302])
    })

    it('affiche un message de confirmation après soumission', () => {
      cy.intercept('POST', '**/contact**', { statusCode: 200 }).as('submitContact')

      cy.get('input[type="email"], input[name*="email"]').first().type('test@test.gouv.fr')
      cy.get('textarea').first().type('Message de test.')
      cy.get('button[type="submit"]').first().click()

      cy.wait('@submitContact')
      cy.get('[data-testid="success-message"], [role="status"], .success, [aria-live="polite"]')
        .should('exist')
    })
  })

  // ─── Flux de création de carte ────────────────────────────────
  describe('Création d\'une carte personnalisée', () => {
    beforeEach(() => {
      // Simuler un utilisateur connecté
      cy.setCookie('session', 'fake-valid-session-token')
      cy.intercept('GET', '**/api/me', {
        statusCode: 200,
        body: { id: '1', email: 'agent@test.gouv.fr', prenom: 'Jean', nom: 'Dupont' }
      })
      cy.visit('/creer-une-carte', { failOnStatusCode: false })
    })

    it('affiche le formulaire de création de carte', () => {
      cy.get('form, [data-testid="create-map-form"]', { timeout: 10000 }).should('exist')
    })

    it('possède un champ pour le titre de la carte', () => {
      cy.get('input[name*="titre"], input[name*="title"], input[placeholder*="titre"]')
        .should('exist')
        .and('be.visible')
    })

    it('possède un champ pour la description', () => {
      cy.get('textarea, input[name*="description"]').should('exist')
    })

    it('permet de saisir un titre et une description', () => {
      cy.get('input[name*="titre"], input[name*="title"], input[placeholder*="titre"]')
        .first()
        .type('Ma carte de test Cypress')

      cy.get('textarea, input[name*="description"]')
        .first()
        .type('Description générée automatiquement par les tests Cypress.')

      cy.get('input[name*="titre"], input[placeholder*="titre"]').first()
        .should('have.value', 'Ma carte de test Cypress')
    })

    it('affiche une erreur si le titre est absent', () => {
      cy.get('button[type="submit"], [data-testid="submit-create"]').first().click()
      cy.get('[aria-live], [role="alert"], :invalid, .error').should('exist')
    })
  })

  // ─── Flux de signalement d'anomalie ───────────────────────────
  describe('Signalement d\'anomalie cartographique', () => {
    beforeEach(() => {
      cy.visit('/', { failOnStatusCode: false })
    })

    it('affiche un lien ou bouton de signalement', () => {
      cy.get(
        '[data-testid="report-btn"], [aria-label*="signaler"], a[href*="signalement"], button[class*="report"]'
      ).should('exist')
    })

    it('ouvre le formulaire de signalement', () => {
      cy.get('[data-testid="report-btn"], [aria-label*="signaler"], a[href*="signalement"]')
        .first()
        .click()
      cy.get('form, [data-testid="report-form"], dialog[open]').should('exist').and('be.visible')
    })
  })

  // ─── Formulaire d'inscription ─────────────────────────────────
  describe('Inscription d\'un nouveau compte', () => {
    beforeEach(() => {
      cy.visit('/inscription', { failOnStatusCode: false })
    })

    it('affiche le formulaire d\'inscription', () => {
      cy.get('form, [data-testid="register-form"]').should('exist')
    })

    it('affiche un champ email', () => {
      cy.get('input[type="email"], input[name*="email"]').should('exist')
    })

    it('affiche un champ mot de passe avec indicateur de force', () => {
      cy.get('input[type="password"]').should('exist')
      cy.get('input[type="password"]').first().type('TestMotDePasseF@rt123!')
      cy.get('[data-testid="password-strength"], [class*="strength"], [aria-label*="force"]')
        .should('exist')
    })

    it('bloque la soumission si les mots de passe ne correspondent pas', () => {
      cy.get('input[type="password"]').first().type('MotDePasse1!')
      cy.get('input[type="password"]').eq(1).type('MotDePasseDifferent!')
      cy.get('button[type="submit"]').first().click()
      cy.get('[aria-live], [role="alert"], :invalid, .error').should('exist')
    })

    it('respecte le RGPD — affiche la case de consentement', () => {
      cy.get('input[type="checkbox"][name*="rgpd"], input[type="checkbox"][name*="cgu"], ' +
        'input[type="checkbox"][aria-label*="consentement"]')
        .should('exist')
    })
  })

  // ─── Validation générique des formulaires ─────────────────────
  describe('Validation des champs', () => {
    it('valide le format email sur les formulaires exposés', () => {
      cy.visit('/contact', { failOnStatusCode: false })
      cy.get('input[type="email"]').first().type('email_invalide_sans_arobase')
      cy.get('button[type="submit"]').first().click()
      cy.get('input[type="email"]').first().then($el => {
        expect($el[0].validity.valid).to.be.false
      })
    })

    it('les champs obligatoires ont l\'attribut aria-required ou required', () => {
      cy.visit('/contact', { failOnStatusCode: false })
      cy.get('input[required], textarea[required], [aria-required="true"]')
        .should('have.length.greaterThan', 0)
    })

    it('les labels sont associés aux champs via for/id ou aria-labelledby', () => {
      cy.visit('/contact', { failOnStatusCode: false })
      cy.get('input:not([type="hidden"]):not([type="submit"])').each($input => {
        const id = $input.attr('id')
        const ariaLabel = $input.attr('aria-label')
        const ariaLabelledBy = $input.attr('aria-labelledby')
        if (id) {
          const labelExists = Cypress.$(`label[for="${id}"]`).length > 0
          if (!labelExists) {
            expect(ariaLabel || ariaLabelledBy, `champ #${id} doit avoir un label`).to.exist
          }
        }
      })
    })
  })
})
