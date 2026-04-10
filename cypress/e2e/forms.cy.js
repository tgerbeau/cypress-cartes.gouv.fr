/**
 * forms.cy.js
 * Tests E2E — Formulaires réels de cartes.gouv.fr
 */

describe('Formulaires', () => {
  describe('Formulaire « Nous écrire »', () => {
    beforeEach(() => {
      cy.visit('/aide/fr/nous-ecrire/')
      cy.contains('h1', 'Nous écrire', { timeout: 10000 }).should('be.visible')
    })

    it('affiche les champs obligatoires du formulaire de contact', () => {
      // Champ email
      cy.get('input[type="email"], input[name*="email"]')
        .should('exist')
        .and('be.visible')

      // Zone de texte pour le message
      cy.get('textarea').should('exist').and('be.visible')

      // Bouton d'envoi
      cy.contains('button', 'Envoyer').should('exist').and('be.visible')
    })

    it('les champs de formulaire ont des labels accessibles', () => {
      cy.get('input:visible, textarea:visible, select:visible')
        .not('[type="hidden"], [type="submit"], [type="button"]')
        .each(($el) => {
          const id = $el.attr('id') || ''
          const hasForLabel = id ? Cypress.$(`label[for="${id}"]`).length > 0 : false
          const hasImplicitLabel = $el.closest('label').length > 0
          const hasAria = Boolean(
            $el.attr('aria-label') ||
            $el.attr('aria-labelledby') ||
            $el.attr('aria-describedby') ||
            $el.attr('title') ||
            $el.attr('placeholder')
          )
          expect(
            hasForLabel || hasImplicitLabel || hasAria,
            `Le champ "${id || $el.attr('name') || $el.attr('type')}" doit avoir un label accessible`
          ).to.be.true
        })
    })

    it('la soumission à vide ne quitte pas la page', () => {
      cy.contains('button', 'Envoyer').click()
      cy.url().should('include', 'nous-ecrire')
    })

    it('la soumission sans remplir les champs affiche des erreurs', () => {
      // Soumettre le formulaire sans remplir aucun champ
      cy.contains('button', 'Envoyer').click()

      // On reste sur la même page
      cy.url().should('include', 'nous-ecrire')

      // Le formulaire affiche des messages d'erreur ou des champs en erreur
      cy.get('[class*="error"], [class*="invalid"], [aria-invalid="true"], .fr-input-group--error, .fr-message--error, [role="alert"]', { timeout: 5000 })
        .should('have.length.at.least', 1)
    })

    it('le champ email rejette une adresse invalide', () => {
      cy.get('input[type="email"], input[name*="email"]')
        .first()
        .clear()
        .type('pas-un-email')

      // Soumettre pour déclencher la validation
      cy.contains('button', 'Envoyer').click()

      // On reste sur la page (le formulaire n'est pas envoyé)
      cy.url().should('include', 'nous-ecrire')
    })
  })

  describe('Bannière de consentement cookies', () => {
    it('la bannière cookies s\'affiche lors de la première visite', () => {
      cy.clearCookies()
      cy.clearLocalStorage()
      // Charger la page sans le cy.visit override pour voir la bannière
      cy.window().then((win) => win.localStorage.clear())
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.clear()
        },
      })
      // La bannière DSFR de consentement doit apparaître
      cy.get('.fr-consent-banner', { timeout: 10000 }).should('be.visible')
      // Elle doit contenir au moins un bouton d'action
      cy.get('.fr-consent-banner button').should('have.length.at.least', 1)
    })

    it('cliquer « Tout accepter » ferme la bannière', () => {
      cy.clearCookies()
      cy.clearLocalStorage()
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.clear()
        },
      })
      cy.get('.fr-consent-banner', { timeout: 10000 }).should('be.visible')
      cy.get('.fr-consent-banner').contains('button', 'Tout accepter').click()
      cy.get('.fr-consent-banner').should('not.exist')
    })
  })
})
