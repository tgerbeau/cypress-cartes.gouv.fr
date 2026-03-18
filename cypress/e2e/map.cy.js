/**
 * map.cy.js
 * Tests E2E — Carte interactive
 * cartes.gouv.fr
 */

describe('Carte interactive', () => {
  // Fermer la modale d'accueil si présente
  const dismissModal = () => {
    cy.get('body').then(($body) => {
      if ($body.find('dialog.fr-modal--opened, .welcome-modal[open]').length) {
        cy.get('body').type('{esc}')
        cy.get('dialog.fr-modal--opened, .welcome-modal[open]').should('not.exist')
      }
    })
  }

  beforeEach(() => {
    cy.visit('/')
    dismissModal()
    cy.get('.ol-viewport', { timeout: 15000 }).should('be.visible')
  })

  it('affiche une carte avec des tuiles rendues dans un canvas', () => {
    // OpenLayers rend les tuiles dans des éléments <canvas>
    cy.get('.ol-viewport canvas').should('exist')
    cy.get('.ol-viewport canvas').first().should(($canvas) => {
      expect($canvas[0].width).to.be.greaterThan(0)
      expect($canvas[0].height).to.be.greaterThan(0)
    })

    // Les contrôles de zoom sont visibles et labellisés
    cy.get('[aria-label="Zoomer"]').should('be.visible')
    cy.get('[aria-label="Dézoomer"]').should('be.visible')

    // Pas d'erreur affichée
    cy.get('.map-error').should('not.exist')
  })

  it('le zoom et dézoom chargent de nouvelles tuiles depuis la Géoplateforme', () => {
    // Intercepter les requêtes de tuiles vers la Géoplateforme
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('tiles')

    // Zoom in → de nouvelles tuiles doivent être chargées
    cy.get('[aria-label="Zoomer"]').first().click({ force: true })
    cy.wait('@tiles', { timeout: 10000 })

    // Le canvas est toujours rendu correctement
    cy.get('.ol-viewport canvas').first().should(($canvas) => {
      expect($canvas[0].width).to.be.greaterThan(0)
    })

    // Zoom out → idem
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('tilesOut')
    cy.get('[aria-label="Dézoomer"]').first().click({ force: true })
    cy.wait('@tilesOut', { timeout: 10000 })
    cy.get('.ol-viewport canvas').should('exist')
  })

  it('la recherche recentre la carte sur le lieu sélectionné', () => {
    // Saisir un lieu
    cy.get('input[role="combobox"][aria-label="Rechercher"]')
      .first()
      .type('Lyon', { force: true })

    // Des suggestions apparaissent
    cy.get('[role="listbox"] [role="option"], .GPautoCompleteProposal, .autoComplete_result', { timeout: 5000 })
      .should('have.length.greaterThan', 0)

    // Intercepter les tuiles qui seront chargées après recentrage
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('recenteredTiles')

    // Cliquer sur la première suggestion
    cy.get('[role="listbox"] [role="option"], .GPautoCompleteProposal, .autoComplete_result')
      .first()
      .click({ force: true })

    // De nouvelles tuiles sont chargées → la carte s'est bien recentrée
    cy.wait('@recenteredTiles', { timeout: 10000 })
    cy.get('.ol-viewport canvas').should('exist')
  })

  it('les contrôles carte sont accessibles au clavier', () => {
    // Les boutons de zoom sont focusables et labellisés
    cy.get('[aria-label="Zoomer"]').first().focus()
    cy.focused().should('have.attr', 'aria-label', 'Zoomer')

    cy.get('[aria-label="Dézoomer"]').first().focus()
    cy.focused().should('have.attr', 'aria-label', 'Dézoomer')

    // La barre de recherche est focusable avec le bon rôle ARIA
    cy.get('input[role="combobox"][aria-label="Rechercher"]').first().focus()
    cy.focused().should('have.attr', 'role', 'combobox')
  })
})
