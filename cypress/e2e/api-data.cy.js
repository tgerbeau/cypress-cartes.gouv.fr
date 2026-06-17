/**
 * api-data.cy.js
 * Tests E2E — API et données de la Géoplateforme
 * cartes.gouv.fr
 */

const datasets = require('../fixtures/datasets.json')
const locations = require('../fixtures/locations.json')
const routes = require('../fixtures/routes.json')

describe('API et données', { tags: '@api' }, () => {
  it('l\'API Géoplateforme (data.geopf.fr) répond correctement', { tags: '@smoke' }, () => {
    cy.request({
      url: 'https://data.geopf.fr/wms-v/ows?service=WMS&version=1.3.0&request=GetCapabilities',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.headers['content-type']).to.include('xml')
      // Le XML contient bien les capabilities WMS
      expect(response.body).to.include('WMS_Capabilities')
      // Temps de réponse acceptable (< 10s)
      expect(response.duration).to.be.lessThan(10000)
    })
  })

  it('la fiche d\'un jeu de données connu est accessible', () => {
    cy.visit(`${routes.catalogue}dataset/${datasets.ortho.slug}`, { failOnStatusCode: false })
    cy.get('body').should('be.visible')
    cy.url().should('include', datasets.ortho.slug)
    cy.contains(datasets.ortho.label, { timeout: 15000 }).should('exist')
    cy.get('header, footer').should('have.length.at.least', 2)
  })

  it('la page découvrir affiche les jeux de données de référence', () => {
    cy.visit(routes.discover)
    cy.contains(datasets.ortho.label).should('exist')
    cy.contains(datasets.scan25.label).should('exist')
    cy.get('a[href*="rechercher-une-donnee/dataset"]').should('have.length.greaterThan', 0)
  })

  it('l\'API de géocodage répond en JSON avec des résultats pertinents', () => {
    cy.request({
      url: `https://data.geopf.fr/geocodage/search?q=${locations.paris.query}&limit=1`,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.headers['content-type']).to.include('application/json')
      expect(response.body.features).to.have.length.greaterThan(0)

      // Le résultat contient un label lisible mentionnant Paris
      const firstResult = response.body.features[0]
      expect(firstResult.properties).to.have.property('label')
      expect(firstResult.properties.label).to.match(new RegExp(locations.paris.expectedLabel, 'i'))

      // Le résultat contient des coordonnées valides
      expect(firstResult.geometry).to.have.property('coordinates')
      expect(firstResult.geometry.coordinates).to.have.length(2)

      // Temps de réponse acceptable (< 5s)
      expect(response.duration).to.be.lessThan(5000)
    })
  })

  it('une requête de géocodage improbable retourne zéro ou très peu de résultats sans erreur serveur', () => {
    cy.request({
      url: `https://data.geopf.fr/geocodage/search?q=${locations.unlikely.query}&limit=1`,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.features).to.be.an('array')
      expect(response.body.features.length).to.be.at.most(1)
    })
  })
})
