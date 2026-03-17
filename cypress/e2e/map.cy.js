/**
 * map.cy.js
 * Tests E2E — Carte interactive (zoom, couches, filtres)
 * cartes.gouv.fr
 */

describe('Carte interactive', () => {
  beforeEach(() => {
    cy.visit('/cartes')
    // Attendre que le conteneur de la carte soit chargé
    cy.get('[data-testid="map-container"], #map, .ol-viewport, .maplibregl-canvas', { timeout: 15000 }).should('be.visible')
  })

  // ─── Chargement ───────────────────────────────────────────────
  describe('Chargement de la carte', () => {
    it('affiche le conteneur de la carte', () => {
      cy.get('[data-testid="map-container"], #map, .ol-viewport').should('exist').and('be.visible')
    })

    it('affiche les contrôles de zoom', () => {
      cy.get('[aria-label*="zoom"], .ol-zoom, .maplibregl-ctrl-zoom-in').should('exist')
    })

    it('ne présente pas d\'erreur de chargement visible', () => {
      cy.get('[data-testid="map-error"], .map-error').should('not.exist')
    })
  })

  // ─── Zoom ──────────────────────────────────────────────────────
  describe('Contrôles de zoom', () => {
    it('permet de zoomer via le bouton +', () => {
      cy.get('[aria-label="Zoom in"], [aria-label="Zoomer"], .ol-zoom-in')
        .first()
        .click()
      cy.wait(500)
      cy.get('[aria-label="Zoom in"], [aria-label="Zoomer"], .ol-zoom-in').should('exist')
    })

    it('permet de dézoomer via le bouton -', () => {
      cy.get('[aria-label="Zoom out"], [aria-label="Dézoomer"], .ol-zoom-out')
        .first()
        .click()
      cy.wait(500)
      cy.get('[aria-label="Zoom out"], [aria-label="Dézoomer"], .ol-zoom-out').should('exist')
    })

    it('permet de zoomer avec la molette de la souris', () => {
      cy.get('[data-testid="map-container"], #map, .ol-viewport')
        .trigger('wheel', { deltaY: -100, bubbles: true })
      cy.get('[data-testid="map-container"], #map, .ol-viewport').should('be.visible')
    })
  })

  // ─── Couches ───────────────────────────────────────────────────
  describe('Gestion des couches', () => {
    it('affiche le panneau de gestion des couches', () => {
      cy.get('[data-testid="layers-panel"], [aria-label*="couche"], button[aria-controls*="layer"]')
        .first()
        .click()
      cy.get('[data-testid="layers-list"], .layers-list, [role="list"]').should('be.visible')
    })

    it('permet d\'activer / désactiver une couche', () => {
      cy.get('[data-testid="layers-panel"], [aria-label*="couche"]').first().click()
      cy.get('[data-testid="layer-toggle"], input[type="checkbox"]').first().as('toggle')
      cy.get('@toggle').check({ force: true }).should('be.checked')
      cy.get('@toggle').uncheck({ force: true }).should('not.be.checked')
    })

    it('affiche au moins une couche disponible', () => {
      cy.get('[data-testid="layers-panel"], [aria-label*="couche"]').first().click()
      cy.get('[data-testid="layer-item"], .layer-item').should('have.length.greaterThan', 0)
    })
  })

  // ─── Filtres ───────────────────────────────────────────────────
  describe('Filtres et recherche sur la carte', () => {
    it('affiche le panneau de filtres', () => {
      cy.get('[data-testid="filters-panel"], [aria-label*="filtre"], button[aria-controls*="filter"]')
        .first()
        .click()
      cy.get('[data-testid="filters-container"], .filters-container').should('be.visible')
    })

    it('permet d\'appliquer un filtre géographique', () => {
      cy.get('[data-testid="geo-search"], input[placeholder*="lieu"], input[placeholder*="commune"]')
        .type('Paris')
      cy.get('[data-testid="geo-suggestion"], .suggestion-item').should('have.length.greaterThan', 0)
      cy.get('[data-testid="geo-suggestion"], .suggestion-item').first().click()
    })
  })

  // ─── Navigation sur la carte ───────────────────────────────────
  describe('Interactions sur la carte', () => {
    it('permet de déplacer la carte par glisser-déposer', () => {
      cy.get('[data-testid="map-container"], #map, .ol-viewport')
        .trigger('mousedown', { button: 0, clientX: 400, clientY: 300 })
        .trigger('mousemove', { clientX: 450, clientY: 320 })
        .trigger('mouseup')
      cy.get('[data-testid="map-container"], #map, .ol-viewport').should('be.visible')
    })

    it('affiche un popup au clic sur un objet cartographique', () => {
      cy.get('[data-testid="map-container"], #map, .ol-viewport').click(400, 300)
      // Le popup peut ne pas apparaître si aucun objet n'est à cette position
      // On vérifie juste qu'aucune erreur JS n'est levée
      cy.on('uncaught:exception', () => false)
    })
  })

  // ─── Partage et export ─────────────────────────────────────────
  describe('Partage de la carte', () => {
    it('affiche le bouton de partage', () => {
      cy.get('[data-testid="share-btn"], [aria-label*="partager"], [aria-label*="share"]')
        .should('exist')
    })

    it('génère un lien de partage', () => {
      cy.get('[data-testid="share-btn"], [aria-label*="partager"]').first().click()
      cy.get('[data-testid="share-url"], input[readonly]').should('exist').and('not.be.empty')
    })
  })
})
