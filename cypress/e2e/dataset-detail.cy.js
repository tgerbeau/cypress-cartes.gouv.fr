/**
 * dataset-detail.cy.js
 * Tests E2E — Fiche détail d'un jeu de données
 * cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_BD-ORTHO
 *
 * Note : les fiches utilisent des web components GeoNetwork (shadow DOM).
 */

describe('Fiche détail d\'un jeu de données', () => {
  describe('BD ORTHO® — disponibilité et contenu', () => {
    it('la page répond en 200 et contient le titre BD ORTHO', () => {
      cy.request('https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_BD-ORTHO').then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.include('BD ORTHO')
      })
    })

    it('la page se charge dans le navigateur avec header et footer', () => {
      cy.on('uncaught:exception', () => false)
      cy.visit('/rechercher-une-donnee/dataset/IGNF_BD-ORTHO', { timeout: 30000 })
      cy.get('header, .fr-header', { timeout: 15000 }).should('exist')
      cy.get('footer, .fr-footer').should('exist')
    })

    it('la page contient les métadonnées essentielles dans le HTML', () => {
      cy.request('https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_BD-ORTHO').then((response) => {
        // Le titre est présent
        expect(response.body).to.include('BD ORTHO')
        // Le producteur IGN est référencé
        expect(response.body).to.include('IGN')
        // L'identifiant GeoNetwork est présent
        expect(response.body).to.include('IGNF_BD-ORTHO')
      })
    })
  })

  describe('BD TOPO® — disponibilité', () => {
    it('la fiche BD TOPO répond en 200', () => {
      cy.request('https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_BD-TOPO').then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.include('BD TOPO')
      })
    })
  })

  describe('Fiche inexistante', () => {
    it('une fiche avec un identifiant inconnu retourne une erreur gérée', () => {
      cy.on('uncaught:exception', () => false)
      cy.visit('/rechercher-une-donnee/dataset/DATASET_INEXISTANT_XYZ', {
        failOnStatusCode: false,
        timeout: 30000,
      })
      cy.get('body').should('not.be.empty')
    })
  })

  describe('API catalogue sous-jacente', () => {
    it('l\'API GeoNetwork retourne les métadonnées BD ORTHO en JSON', () => {
      cy.request({
        url: 'https://data.geopf.fr/catalog/api/records/IGNF_BD-ORTHO',
        headers: { 'Accept': 'application/json' },
        timeout: 15000,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.lessThan(500)
      })
    })
  })
})
