/**
 * catalogue-donnees.cy.js
 * Tests E2E — Catalogue de données (rechercher une donnée)
 * cartes.gouv.fr/rechercher-une-donnee
 *
 * Note : la page utilise des web components GeoNetwork (shadow DOM).
 * Les tests se concentrent sur la disponibilité HTTP, la structure
 * visible et les liens vers les fiches de données.
 */

describe('Catalogue de données', { tags: '@catalogue' }, () => {
  it('la page du catalogue répond en 200 et contient du contenu', { tags: '@smoke' }, () => {
    cy.request('https://cartes.gouv.fr/rechercher-une-donnee/').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.include('rechercher-une-donnee')
    })
  })

  it('le catalogue charge et permet d\'accéder à une fiche de données', { tags: '@smoke' }, () => {
    cy.on('uncaught:exception', () => false)
    // Vérifier que le catalogue se charge
    cy.visit('/rechercher-une-donnee/', { timeout: 30000 })
    cy.get('body', { timeout: 15000 }).should('not.be.empty')
    cy.get('header, .fr-header').should('exist')
    // Naviguer vers une fiche connue (les liens dataset sont dans le shadow DOM)
    cy.visit('/rechercher-une-donnee/dataset/IGNF_BD-ORTHO', { timeout: 30000 })
    cy.get('body', { timeout: 15000 }).should('not.be.empty')
    cy.get('header, .fr-header').should('exist')
    cy.get('footer, .fr-footer').should('exist')
    cy.url().should('include', '/dataset/')
    cy.contains('BD ORTHO', { timeout: 15000 }).should('exist')
  })

  it('la page du catalogue se charge dans le navigateur', () => {
    cy.on('uncaught:exception', () => false)
    cy.visit('https://cartes.gouv.fr/rechercher-une-donnee/', { timeout: 30000 })
    cy.get('body', { timeout: 15000 }).should('not.be.empty')
    // Le header DSFR est présent
    cy.get('header, .fr-header').should('exist')
    // Le footer DSFR est présent
    cy.get('footer, .fr-footer').should('exist')
  })

  it('le HTML de la page catalogue référence des datasets', () => {
    cy.on('uncaught:exception', () => false)
    cy.visit('https://cartes.gouv.fr/rechercher-une-donnee/', { timeout: 30000 })
    cy.get('body', { timeout: 15000 }).should('contain.text', 'donn')
  })

  it('l\'API catalogue GeoNetwork est joignable', () => {
    cy.request({
      url: 'https://data.geopf.fr/catalog/api/search',
      timeout: 15000,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.lessThan(500)
    })
  })

  it('une fiche de données connue est accessible — BD ORTHO', () => {
    cy.request({
      url: 'https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_BD-ORTHO/',
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.oneOf([200, 301, 302])
    })
  })

  it('une fiche de données connue est accessible — BD TOPO', () => {
    cy.request({
      url: 'https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_BD-TOPO/',
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.oneOf([200, 301, 302])
    })
  })
})
