/**
 * forms.cy.js
 * Tests E2E — Formulaires réels de cartes.gouv.fr
 */

describe('Formulaires', { tags: '@form' }, () => {
  describe('Formulaire « Nous écrire »', () => {
    beforeEach(() => {
      cy.visit('/aide/fr/nous-ecrire/')
      cy.get('form, textarea', { timeout: 15000 }).should('exist')
    })

    it('affiche les champs obligatoires du formulaire de contact', () => {
      // Champ email
      cy.get('input#input-mail, input[name="email_contact"]')
        .should('exist')
        .and('be.visible')

      // Zone de texte pour le message
      cy.get('textarea').should('exist').and('be.visible')

      // Bouton d'envoi
      cy.get('button').contains(/envoyer|soumettre|valider/i).should('exist').and('be.visible')
    })

    it('les champs de formulaire ont des labels accessibles', () => {
      cy.get('input.fr-input:visible, textarea.fr-input:visible, select.fr-select:visible')
        .each(($el) => {
          const id = $el.attr('id') || ''
          const hasForLabel = id ? Cypress.$(`label[for="${id}"]`).length > 0 : false
          const hasAria = Boolean(
            $el.attr('aria-label') ||
            $el.attr('aria-labelledby') ||
            $el.attr('title') ||
            $el.attr('placeholder')
          )
          expect(
            hasForLabel || hasAria,
            `Le champ "${id || $el.attr('name') || $el.attr('type')}" doit avoir un label accessible`
          ).to.be.true
        })
    })

    it('la soumission à vide ne quitte pas la page', () => {
      cy.get('button').contains(/envoyer|soumettre|valider/i).click()
      cy.url().should('include', 'nous-ecrire')
    })

    it('la validation empêche l\'envoi si les champs sont vides', () => {
      // Vérifier que les champs du formulaire existent
      cy.get('input#input-mail, input[name="email_contact"]').should('exist')
      cy.get('textarea').should('exist')

      // Soumettre sans remplir
      cy.get('button').contains(/envoyer|soumettre|valider/i).click()

      // On reste sur la même page (pas de navigation vers une page de succès)
      cy.url().should('include', 'nous-ecrire')
    })

    it('le champ email accepte du texte', () => {
      cy.get('input#input-mail, input[name="email_contact"]')
        .first()
        .clear()
        .type('test@example.com')
        .should('have.value', 'test@example.com')
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
