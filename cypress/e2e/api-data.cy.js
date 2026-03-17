/**
 * api-data.cy.js
 * Tests E2E — API et données téléchargeables
 * cartes.gouv.fr
 */

describe('API et données téléchargeables', () => {
  // ─── Catalogue de données ──────────────────────────────────────
  describe('Catalogue de données', () => {
    beforeEach(() => {
      cy.visit('/catalogue', { failOnStatusCode: false })
      cy.url().then(url => {
        if (!url.includes('catalogue')) cy.visit('/donnees', { failOnStatusCode: false })
      })
    })

    it('affiche la liste des jeux de données', () => {
      cy.get('[data-testid="dataset-list"], .dataset-list, [role="list"]', { timeout: 10000 })
        .should('exist')
    })

    it('affiche au moins un jeu de données', () => {
      cy.get('[data-testid="dataset-item"], .dataset-item, article', { timeout: 10000 })
        .should('have.length.greaterThan', 0)
    })

    it('chaque jeu de données a un titre', () => {
      cy.get('[data-testid="dataset-item"], .dataset-item, article').first()
        .find('h2, h3, [data-testid="dataset-title"]')
        .should('not.be.empty')
    })

    it('affiche les métadonnées (format, licence, date de mise à jour)', () => {
      cy.get('[data-testid="dataset-item"], .dataset-item, article').first().within(() => {
        cy.get('[data-testid="dataset-format"], .badge, time, [class*="meta"]').should('exist')
      })
    })
  })

  // ─── Recherche dans le catalogue ──────────────────────────────
  describe('Recherche de données', () => {
    beforeEach(() => {
      cy.visit('/catalogue', { failOnStatusCode: false })
    })

    it('possède un champ de recherche dans le catalogue', () => {
      cy.get('input[type="search"], input[placeholder*="recherch"], [data-testid="catalogue-search"]')
        .should('exist')
        .and('be.visible')
    })

    it('filtre les résultats lors d\'une recherche', () => {
      cy.intercept('GET', '**/api/**datasets**').as('searchDatasets')
      cy.get('input[type="search"], input[placeholder*="recherch"]').first().type('parcelle')
      cy.wait('@searchDatasets', { timeout: 10000 })
      cy.get('[data-testid="dataset-item"], .dataset-item, article').should('have.length.greaterThan', 0)
    })

    it('affiche un message si aucun résultat', () => {
      cy.get('input[type="search"], input[placeholder*="recherch"]').first()
        .type('xxxxxxxxxxx_inexistant')
      cy.get('[data-testid="no-results"], .no-results, [aria-live]', { timeout: 8000 })
        .should('exist')
    })
  })

  // ─── Fiche détail d'un jeu de données ─────────────────────────
  describe('Fiche d\'un jeu de données', () => {
    beforeEach(() => {
      cy.visit('/catalogue', { failOnStatusCode: false })
      cy.get('[data-testid="dataset-item"] a, .dataset-item a, article a', { timeout: 10000 })
        .first()
        .click()
    })

    it('affiche le titre du jeu de données', () => {
      cy.get('h1, [data-testid="dataset-title"]').should('not.be.empty')
    })

    it('affiche la description du jeu de données', () => {
      cy.get('[data-testid="dataset-description"], .description, main p').should('exist')
    })

    it('affiche les formats de téléchargement disponibles', () => {
      cy.get('[data-testid="download-formats"], [class*="download"], [aria-label*="Télécharger"]')
        .should('exist')
    })

    it('le bouton de téléchargement est accessible', () => {
      cy.get('a[download], [data-testid="download-btn"], [aria-label*="Télécharger"]')
        .first()
        .should('have.attr', 'href')
        .and('not.be.empty')
    })
  })

  // ─── Appels API REST ───────────────────────────────────────────
  describe('API REST', () => {
    it('l\'API catalogue répond en moins de 3 secondes', () => {
      const start = Date.now()
      cy.request({
        url: 'https://cartes.gouv.fr/api/datasets',
        failOnStatusCode: false
      }).then(response => {
        expect(Date.now() - start).to.be.lessThan(3000)
        expect(response.status).to.be.oneOf([200, 201, 204])
      })
    })

    it('l\'API retourne du JSON', () => {
      cy.request({
        url: 'https://cartes.gouv.fr/api/datasets',
        failOnStatusCode: false
      }).then(response => {
        if (response.status === 200) {
          expect(response.headers['content-type']).to.include('application/json')
        }
      })
    })

    it('intercepte et valide la réponse de l\'API catalogue via l\'UI', () => {
      cy.intercept('GET', '**/api/**', req => {
        req.continue(res => {
          expect(res.statusCode).to.be.oneOf([200, 204, 304])
        })
      }).as('apiCall')
      cy.visit('/catalogue', { failOnStatusCode: false })
      cy.wait('@apiCall', { timeout: 10000 })
    })
  })

  // ─── Téléchargement ────────────────────────────────────────────
  describe('Téléchargement de fichiers', () => {
    it('un lien de téléchargement pointe vers une URL valide', () => {
      cy.visit('/catalogue', { failOnStatusCode: false })
      cy.get('[data-testid="dataset-item"] a, .dataset-item a', { timeout: 10000 }).first().click()
      cy.get('a[download], [data-testid="download-btn"], [aria-label*="Télécharger"]')
        .first()
        .should('have.attr', 'href')
        .then(href => {
          expect(href).to.match(/^https?:\/\//)
        })
    })

    it('les liens de téléchargement ne renvoient pas une erreur 404', () => {
      cy.visit('/catalogue', { failOnStatusCode: false })
      cy.get('[data-testid="dataset-item"] a, .dataset-item a', { timeout: 10000 }).first().click()
      cy.get('a[download], [aria-label*="Télécharger"]').first()
        .invoke('attr', 'href')
        .then(href => {
          if (href && href.startsWith('http')) {
            cy.request({ url: href, failOnStatusCode: false })
              .its('status')
              .should('not.equal', 404)
          }
        })
    })
  })
})
