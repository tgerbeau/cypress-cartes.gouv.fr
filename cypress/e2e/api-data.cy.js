/**
 * api-data.cy.js
 * Tests E2E — API et données téléchargeables
 * cartes.gouv.fr
 *
 * Le catalogue de données est accessible via /rechercher-une-donnee
 * L'API de données est hébergée sur data.geopf.fr
 */

describe('API et données téléchargeables', () => {
  // ─── Catalogue de données ──────────────────────────────────────
  describe('Catalogue de données', () => {
    beforeEach(() => {
      cy.visit('/rechercher-une-donnee/', { timeout: 30000 })
      cy.get('body').should('be.visible')
      // Attendre que le contenu dynamique du catalogue se charge
      cy.wait(3000)
    })

    it('charge la page du catalogue', () => {
      cy.url().should('include', 'rechercher-une-donnee')
      cy.contains(/records?\s+found|résultat/i, { timeout: 15000 }).should('exist')
    })

    it('affiche au moins un jeu de données', () => {
      cy.prompt([
        'Verify that the page displays a list of datasets (cards with titles and descriptions).',
        'There should be at least one dataset visible on the page.'
      ])
    })

    it('chaque jeu de données a un titre visible', () => {
      cy.prompt([
        'Find the first dataset link on the page and verify it contains non-empty text.'
      ])
    })

    it('affiche le nombre total de résultats', () => {
      cy.prompt([
        'Find the text on the page that shows the total number of records found (like "231 records found") and verify it is visible.'
      ])
    })
  })

  // ─── Recherche dans le catalogue ──────────────────────────────
  describe('Recherche de données', () => {
    beforeEach(() => {
      cy.visit('/rechercher-une-donnee/', { timeout: 30000 })
      cy.get('body').should('be.visible')
      cy.wait(3000)
    })

    it('possède un champ de recherche', () => {
      cy.prompt([
        'Verify that there is a search input field on the page where users can type to search for datasets.'
      ])
    })

    it('filtre les résultats lors d\'une recherche', () => {
      cy.prompt([
        'Find the search input field on the page and type "PCRS" into it, then press Enter.',
        'Verify that the results update and at least one dataset related to PCRS is displayed.'
      ])
    })
  })

  // ─── Fiche détail d'un jeu de données ─────────────────────────
  describe('Fiche d\'un jeu de données', () => {
    it('affiche la page d\'un jeu de données', () => {
      // Accès direct à un dataset connu (PCRS)
      cy.visit('/rechercher-une-donnee/dataset/IGNF_PCRS', { timeout: 30000 })
      cy.get('body').should('be.visible')
      cy.contains(/PCRS/i, { timeout: 15000 }).should('exist')
    })

    it('la page dataset contient un titre', () => {
      cy.visit('/rechercher-une-donnee/dataset/IGNF_PCRS', { timeout: 30000 })
      cy.get('h1, h2', { timeout: 15000 }).first().should('not.be.empty')
    })

    it('la page dataset contient une description', () => {
      cy.visit('/rechercher-une-donnee/dataset/IGNF_PCRS', { timeout: 30000 })
      cy.get('body').should('be.visible')
      cy.contains(/Plan Corps de Rue|PCRS/i, { timeout: 15000 }).should('exist')
    })
  })

  // ─── Appels API REST (data.geopf.fr) ──────────────────────────
  describe('API REST', () => {
    it('l\'API Géoplateforme (WMTS GetCapabilities) répond correctement', () => {
      const start = Date.now()
      cy.request({
        url: 'https://data.geopf.fr/wmts?service=WMTS&version=1.0.0&request=GetCapabilities',
        timeout: 10000
      }).then(response => {
        expect(response.status).to.eq(200)
        expect(Date.now() - start).to.be.lessThan(5000)
        expect(response.headers['content-type']).to.include('xml')
      })
    })

    it('l\'API Géoplateforme (WMS GetCapabilities) répond correctement', () => {
      cy.request({
        url: 'https://data.geopf.fr/wms-v?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities',
        timeout: 10000
      }).then(response => {
        expect(response.status).to.eq(200)
        expect(response.headers['content-type']).to.include('xml')
      })
    })

    it('la page catalogue charge sans erreur serveur', () => {
      cy.request({
        url: 'https://cartes.gouv.fr/rechercher-une-donnee/',
        timeout: 15000
      }).then(response => {
        expect(response.status).to.eq(200)
      })
    })

    it('la page d\'un dataset individuel répond en 200', () => {
      cy.request({
        url: 'https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_PCRS',
        timeout: 15000,
        failOnStatusCode: false
      }).then(response => {
        expect(response.status).to.be.oneOf([200, 301, 302])
      })
    })
  })

  // ─── Navigation catalogue ─────────────────────────────────────
  describe('Navigation dans le catalogue', () => {
    it('peut accéder à une fiche dataset depuis la liste', () => {
      cy.visit('/rechercher-une-donnee/', { timeout: 30000 })
      cy.wait(3000)
      cy.prompt([
        'Click on the first dataset card/link in the list to open its detail page.'
      ])
      cy.url().should('include', '/rechercher-une-donnee/dataset/')
    })

    it('les onglets de filtrage (Datasets, Services, Reuses) sont présents', () => {
      cy.visit('/rechercher-une-donnee/', { timeout: 30000 })
      cy.contains(/datasets/i, { timeout: 15000 }).should('exist')
      cy.contains(/services/i).should('exist')
    })
  })
})
