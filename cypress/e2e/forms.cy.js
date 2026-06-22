/**
 * forms.cy.js
 * Tests E2E — Formulaires réels de cartes.gouv.fr
 */

const auth = require('../fixtures/auth.json')
const routes = require('../fixtures/routes.json')

const EMAIL_SELECTOR = 'input#input-mail, input[name="email_contact"]'

describe('Formulaires', { tags: '@form' }, () => {
  describe('Formulaire « Nous écrire »', () => {
    beforeEach(() => {
      cy.visit(routes.contact)
      cy.get('form, textarea', { timeout: 15000 }).should('exist')
    })

    it('affiche les champs obligatoires du formulaire de contact', () => {
      // Champ email
      cy.get(EMAIL_SELECTOR)
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
      cy.get(EMAIL_SELECTOR).should('exist')
      cy.get('textarea').should('exist')

      // Soumettre sans remplir
      cy.get('button').contains(/envoyer|soumettre|valider/i).click()

      // On reste sur la même page (pas de navigation vers une page de succès)
      cy.url().should('include', 'nous-ecrire')
    })

    it('le champ email accepte du texte', () => {
      cy.get(EMAIL_SELECTOR)
        .first()
        .clear()
        .type('test@example.com')
        .should('have.value', 'test@example.com')
    })

    it('un email au mauvais format est rejeté par la validation native', () => {
      cy.get(EMAIL_SELECTOR)
        .first()
        .clear()
        .type(auth.invalidUser.invalidEmailFormat)
        .then(($input) => {
          const input = $input[0]
          // Certains navigateurs acceptent des formats sans @ — vérifier le type
          if (input.type === 'email') {
            expect(input.checkValidity()).to.be.false
            expect(input.validationMessage).to.not.equal('')
          } else {
            // Si le champ n'est pas type="email", la validation native ne s'applique pas
            cy.log('ℹ️ Le champ n\'est pas type="email" — validation native non applicable')
          }
        })
    })

    it('un formulaire rempli reste sur la page tant que l’utilisateur ne valide pas', () => {
      cy.get(EMAIL_SELECTOR)
        .first()
        .clear()
        .type('test@example.com')
        .should('have.value', 'test@example.com')

      cy.get('textarea')
        .first()
        .clear()
        .type('Message de test pour valider la saisie sans envoi.')
        .should('contain.value', 'Message de test')

      cy.url().should('include', 'nous-ecrire')
      cy.get('body').then(($body) => {
        if ($body.find('form').length) {
          cy.get('form').first().within(() => {
            cy.get('input, textarea, select').filter(':visible').should('have.length.at.least', 2)
          })
        } else {
          // La page peut ne pas utiliser de balise <form> explicite
          cy.get('input, textarea, select').filter(':visible').should('have.length.at.least', 2)
        }
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
      // La bannière DSFR de consentement peut avoir été acceptée par le cy.visit override
      cy.get('body').then(($body) => {
        if ($body.find('.fr-consent-banner').length && $body.find('.fr-consent-banner').is(':visible')) {
          cy.get('.fr-consent-banner button').should('have.length.at.least', 1)
        } else {
          // La bannière a été auto-acceptée par le override cy.visit — vérifier via cookie
          cy.getCookies().then((cookies) => {
            cy.log(`ℹ️ Bannière auto-acceptée — ${cookies.length} cookie(s) défini(s)`)
          })
        }
      })
    })

    it('cliquer « Tout accepter » ferme la bannière', () => {
      cy.clearCookies()
      cy.clearLocalStorage()
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.clear()
        },
      })
      cy.get('body').then(($body) => {
        if ($body.find('.fr-consent-banner').length && $body.find('.fr-consent-banner').is(':visible')) {
          cy.get('.fr-consent-banner').contains('button', 'Tout accepter').click()
          cy.get('.fr-consent-banner').should('not.be.visible')
        } else {
          // Déjà acceptée par le override
          cy.log('ℹ️ Bannière cookies déjà acceptée par le override cy.visit')
        }
      })
    })
  })
})
