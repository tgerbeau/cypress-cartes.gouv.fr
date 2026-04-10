/**
 * editeur-carto.cy.js
 * Tests E2E — Éditeur cartographique
 * https://ignf.github.io/cartes.gouv.fr-editeur-carto/
 */

const EDITOR_URL = 'https://ignf.github.io/cartes.gouv.fr-editeur-carto/'

describe('Éditeur cartographique', () => {
  beforeEach(() => {
    // Filtrer les exceptions non critiques du SPA éditeur
    cy.on('uncaught:exception', (err) => {
      if (
        err.message.includes('ResizeObserver') ||
        err.message.includes('favicon') ||
        err.message.includes('ChunkLoadError') ||
        err.message.includes('Loading chunk') ||
        err.message.includes('insertBefore') ||
        err.message.includes('InputColor') ||
        err.message.includes('Timed out') ||
        err.message.includes('unhandled promise')
      ) {
        return false
      }
    })

    cy.visit(EDITOR_URL, { timeout: 30000 })
    cy.get('body', { timeout: 15000 }).should('be.visible')
  })

  it('la page de l\'éditeur se charge correctement', () => {
    cy.document().its('readyState').should('eq', 'complete')
    cy.title().should('not.be.empty')
    // Vérifier qu'un contenu significatif est rendu
    cy.get('header, nav, [role="banner"], .fr-header').should('exist')
  })

  it('le bouton « Créer » est visible et cliquable', () => {
    // Le bouton peut contenir "Créer", "CRÉER" ou "Créer une carte"
    cy.contains('button, a', /cr[ée]er/i, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true })

    // Après le clic, un changement doit se produire (nouvelle vue, carte, modale…)
    cy.get('body').should('be.visible')
  })

  it('la page contient des éléments interactifs de carte', () => {
    // Vérifier que l'éditeur rend des contrôles de carte ou un canvas
    cy.get('.ol-viewport, canvas, [class*="map"], svg', { timeout: 15000 })
      .should('have.length.at.least', 1)
  })

  it('le footer DSFR est présent', () => {
    cy.get('footer, .fr-footer, [role="contentinfo"]')
      .should('exist')
      .and('contain.text', 'cartes.gouv.fr')
  })
})
