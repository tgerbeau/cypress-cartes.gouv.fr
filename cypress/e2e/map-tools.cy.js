const locations = require('../fixtures/locations.json')
const routes = require('../fixtures/routes.json')

const SEARCH_RESULT_SELECTOR = '.GPautoCompleteList li, [role="listbox"] [role="option"], [class*="GPsearchResult"], [class*="suggestion"]'

/**
 * map-tools.cy.js
 * Tests E2E — Outils cartographiques (mesure, itinéraire, isochrone)
 * cartes.gouv.fr/explorer-les-cartes
 */

describe('Outils cartographiques', { tags: '@map' }, () => {
  beforeEach(() => {
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('tiles')
    cy.visit(routes.explorer)
    cy.get('.ol-viewport', { timeout: 15000 }).should('be.visible')
  })

  describe('Carte de l\'explorateur', () => {
    it('la carte s\'affiche avec un canvas rendu', { tags: '@smoke' }, () => {
      cy.get('.ol-viewport canvas').should('exist')
      cy.get('.ol-viewport canvas').first().should(($canvas) => {
        expect($canvas[0].width).to.be.greaterThan(0)
        expect($canvas[0].height).to.be.greaterThan(0)
      })
    })

    it('les contrôles de zoom sont présents et fonctionnels', () => {
      cy.get('[aria-label="Zoomer"], button.ol-zoom-in', { timeout: 10000 })
        .first()
        .should('be.visible')
      cy.get('[aria-label="Dézoomer"], button.ol-zoom-out', { timeout: 10000 })
        .first()
        .should('be.visible')
    })

    it('l\'échelle de la carte est affichée', () => {
      cy.get('.ol-scale-line, [class*="scale"]', { timeout: 10000 })
        .should('exist')
    })
  })

  describe('Barre de recherche', () => {
    it('le champ de recherche par adresse est visible', { tags: '@smoke' }, () => {
      cy.getMapSearchInput()
        .should('be.visible')
    })

    it('la recherche d\'une adresse retourne des suggestions', () => {
      cy.intercept({ url: /data\.geopf\.fr.*geocodage|completion/ }).as('geocode')

      // Attendre et fermer la modale d'accueil qui recouvre systématiquement la page carte
      cy.get('dialog.welcome-modal[open], .fr-modal--opened', { timeout: 10000 }).then(() => {
        cy.get('body').type('{esc}')
      })
      cy.get('dialog.welcome-modal[open], .fr-modal--opened', { timeout: 5000 }).should('not.exist')

      cy.getMapSearchInput()
        .clear({ force: true })
        .type(locations.eiffelTower.query, { force: true })

      cy.wait('@geocode', { timeout: 15000 }).its('response.statusCode').should('be.lessThan', 500)

      cy.get(SEARCH_RESULT_SELECTOR, { timeout: 10000 })
        .should('have.length.at.least', 1)
        .first()
        .click({ force: true })

      cy.getMapSearchInput()
        .invoke('val')
        .should('match', new RegExp(locations.eiffelTower.expectedLabel, 'i'))
    })
  })

  describe('Outils de mesure', () => {
    it('le panneau d\'outils est accessible', () => {
      cy.get('body').then(($body) => {
        const candidates = $body.find(
          '[aria-label*="outil"], [aria-label*="mesur"], [aria-label*="tool"], button[class*="tool"], [class*="toolbox"] button, [class*="toolbar"] button'
        )

        expect(candidates.length, 'Au moins un contrôle d’outil doit être présent').to.be.greaterThan(0)

        cy.wrap(candidates[0])
          .should('be.visible')
          .then(($button) => {
            const accessibleName = [
              $button.attr('aria-label') || '',
              $button.attr('title') || '',
              $button.text().trim(),
            ].join(' ').trim()

            expect(accessibleName, 'Le contrôle doit avoir un nom accessible').to.not.be.empty

            cy.wrap($button).click({ force: true })
          })

        cy.get('body').should(($updatedBody) => {
          const text = $updatedBody.text().toLowerCase()
          const hasExpandedControl = $updatedBody.find('[aria-expanded="true"], [data-fr-opened="true"]').length > 0
          const hasToolUiHint = ['mesure', 'outil', 'distance', 'dessin', 'draw'].some((hint) =>
            text.includes(hint)
          )

          expect(
            hasExpandedControl || hasToolUiHint,
            'L’activation du contrôle doit exposer un panneau ou un mode outil'
          ).to.be.true
        })
      })
    })
  })

  describe('API de géocodage (sous-jacente)', () => {
    it('l\'API de géocodage de la Géoplateforme répond correctement', () => {
      cy.request({
        url: 'https://data.geopf.fr/geocodage/search?q=Tour+Eiffel&limit=5',
        timeout: 10000,
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('features')
        expect(response.body.features).to.have.length.at.least(1)
      })
    })

    it('l\'API d\'itinéraire de la Géoplateforme répond', () => {
      // Test que l'endpoint itinéraire est joignable
      cy.request({
        url: 'https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&start=2.3522,48.8566&end=2.2945,48.8584&profile=car&optimization=fastest',
        timeout: 15000,
        failOnStatusCode: false,
      }).then((response) => {
        // L'API doit répondre (200 ou 400 si params invalides, mais pas 5xx)
        expect(response.status).to.be.lessThan(500)
      })
    })

    it('l\'API isochrone de la Géoplateforme répond', () => {
      cy.request({
        url: 'https://data.geopf.fr/navigation/isochrone?resource=bdtopo-osrm&point=2.3522,48.8566&costType=time&costValue=300&profile=car',
        timeout: 15000,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.lessThan(500)
      })
    })
  })

  describe('Interaction carte', () => {
    it('un zoom avant charge de nouvelles tuiles', () => {
      cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('zoomTiles')

      cy.get('[aria-label="Zoomer"], button.ol-zoom-in', { timeout: 10000 })
        .first()
        .click({ force: true })

      cy.wait('@zoomTiles', { timeout: 10000 })
      cy.get('.ol-viewport canvas').should('exist')
    })
  })
})
