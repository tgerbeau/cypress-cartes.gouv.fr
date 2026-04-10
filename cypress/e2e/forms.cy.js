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
          const hasAria = Boolean(
            $el.attr('aria-label') ||
            $el.attr('aria-labelledby') ||
            $el.attr('title')
          )
          expect(
            hasForLabel || hasAria,
            `Le champ "${id || $el.attr('name') || $el.attr('type')}" doit avoir un label accessible`
          ).to.be.true
        })
    })

    it('la soumission à vide ne quitte pas la page', () => {
      cy.contains('button', 'Envoyer').click()
      cy.url().should('include', 'nous-ecrire')
    })

    it('la validation HTML5 bloque l\'envoi si un champ requis est vide', () => {
      // Vérifier qu'au moins un champ a l'attribut required ou aria-required
      cy.get('[required], [aria-required="true"]').should('have.length.at.least', 1)

      // Soumettre sans remplir → le navigateur bloque via validation HTML5
      cy.contains('button', 'Envoyer').click()

      // On reste sur la même page (pas de navigation)
      cy.url().should('include', 'nous-ecrire')

      // Vérifier qu'un champ requis vide est en état invalide
      cy.get('[required], [aria-required="true"]')
        .first()
        .then(($el) => {
          expect($el[0].checkValidity(), 'Le champ requis vide doit être invalide').to.be.false
        })
    })

    it('le champ email rejette une adresse invalide', () => {
      cy.get('input[type="email"], input[name*="email"]')
        .first()
        .clear()
        .type('pas-un-email')
        .then(($el) => {
          expect($el[0].checkValidity(), 'Un email invalide doit être rejeté').to.be.false
        })
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
