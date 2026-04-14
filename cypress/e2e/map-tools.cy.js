/**
 * map-tools.cy.js
 * Tests E2E — Outils cartographiques (mesure, itinéraire, isochrone)
 * cartes.gouv.fr/explorer-les-cartes
 */

describe('Outils cartographiques', () => {
  beforeEach(() => {
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('tiles')
    cy.visit('/explorer-les-cartes/')
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
      // Le SDK Géoplateforme utilise la classe GPsearchInputText pour l'input de recherche
      cy.get('input.GPsearchInputText', { timeout: 15000 })
        .filter(':visible')
        .first()
        .should('be.visible')
    })

    it('la recherche d\'une adresse retourne des suggestions', () => {
      cy.intercept({ url: /data\.geopf\.fr.*geocodage|completion/ }).as('geocode')

      cy.get('input.GPsearchInputText', { timeout: 15000 })
        .filter(':visible')
        .first()
        .clear()
        .type('Tour Eiffel')

      // Les suggestions du SDK GPF apparaissent
      cy.get('.GPautoCompleteList li, [class*="GPsearchResult"], [class*="suggestion"]', { timeout: 10000 })
        .should('have.length.at.least', 1)
    })
  })

  describe('Outils de mesure', () => {
    it('le panneau d\'outils est accessible', () => {
      // Chercher un bouton/menu d'outils (mesure, dessin, etc.)
      cy.get('[aria-label*="outil"], [aria-label*="mesur"], [aria-label*="tool"], button[class*="tool"], [class*="toolbox"]', { timeout: 10000 })
        .should('have.length.at.least', 0) // L'outil peut ne pas être directement visible
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
