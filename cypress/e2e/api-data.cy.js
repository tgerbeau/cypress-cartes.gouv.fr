/**
 * api-data.cy.js
 * Tests E2E — API et données de la Géoplateforme
 * cartes.gouv.fr
 */

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
    cy.visit('/rechercher-une-donnee/dataset/IGNF_BD-ORTHO', { failOnStatusCode: false })
    cy.get('body').should('be.visible')
    cy.url().should('include', 'BD-ORTHO')
  })

  it('la page découvrir affiche les jeux de données de référence', () => {
    cy.visit('/decouvrir')
    cy.contains('BD ORTHO').should('exist')
    cy.contains('SCAN 25').should('exist')
    cy.get('a[href*="rechercher-une-donnee/dataset"]').should('have.length.greaterThan', 0)
  })

  it('l\'API de géocodage répond en JSON avec des résultats pertinents', () => {
    cy.request({
      url: 'https://data.geopf.fr/geocodage/search?q=Paris&limit=1',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.headers['content-type']).to.include('application/json')
      expect(response.body.features).to.have.length.greaterThan(0)

      // Le résultat contient un label lisible mentionnant Paris
      const firstResult = response.body.features[0]
      expect(firstResult.properties).to.have.property('label')
      expect(firstResult.properties.label).to.match(/paris/i)

      // Le résultat contient des coordonnées valides
      expect(firstResult.geometry).to.have.property('coordinates')
      expect(firstResult.geometry.coordinates).to.have.length(2)

      // Temps de réponse acceptable (< 5s)
      expect(response.duration).to.be.lessThan(5000)
    })
  })
})
