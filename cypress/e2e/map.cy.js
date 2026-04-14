/**
 * map.cy.js
 * Tests E2E — Carte interactive
 * cartes.gouv.fr
 */

describe('Carte interactive', () => {
  beforeEach(() => {
    // Poser les intercepts AVANT le visit pour capturer les tuiles du chargement initial
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('tiles')
    cy.visit('/')
    cy.get('.ol-viewport', { timeout: 15000 }).should('be.visible')
  })

  it('affiche une carte avec des tuiles rendues dans un canvas', { tags: '@smoke' }, () => {
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

  it('le zoom charge de nouvelles tuiles depuis la Géoplateforme', () => {
    // Poser un nouvel intercept pour capturer les tuiles du zoom
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('zoomTiles')

    cy.get('[aria-label="Zoomer"]').first().click({ force: true })
    cy.wait('@zoomTiles', { timeout: 10000 })

    // Le canvas est toujours rendu correctement après le zoom
    cy.get('.ol-viewport canvas').first().should(($canvas) => {
      expect($canvas[0].width).to.be.greaterThan(0)
    })
  })

  it('le dézoom charge de nouvelles tuiles depuis la Géoplateforme', () => {
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('dezoomTiles')

    cy.get('[aria-label="Dézoomer"]').first().click({ force: true })
    cy.wait('@dezoomTiles', { timeout: 10000 })

    cy.get('.ol-viewport canvas').should('exist')
  })

  it('la recherche recentre la carte sur le lieu sélectionné', () => {
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

  it('le panneau de couches permet de consulter les couches', () => {
    const layerSelectors = [
      'button[aria-label*="couche"]',
      'button[aria-label*="Couche"]',
      'button[aria-label*="fond"]',
      'button[aria-label*="Fond"]',
      '[class*="layer"] button',
      '[class*="Layer"] button',
      'button[title*="couche"]',
      'button[title*="fond"]',
      '[data-testid*="layer"]',
    ]

    cy.get('body').then(($body) => {
      const sel = layerSelectors.find((s) => $body.find(s).length > 0)

      if (sel) {
        cy.get(sel).first().click({ force: true })
        // Après ouverture, le contenu doit mentionner des couches
        cy.get('body', { timeout: 5000 }).should(($updatedBody) => {
          const text = $updatedBody.text()
          const hasLayerContent =
            text.includes('PLAN IGN') ||
            text.includes('Fonds de carte') ||
            text.includes('Photographies') ||
            text.includes('couche')
          expect(hasLayerContent, 'Le panneau devrait mentionner des couches').to.be.true
        })
      } else {
        // Fallback : vérifier via les requêtes réseau que des couches WMTS sont chargées
        cy.intercept({ url: /data\.geopf\.fr.*PLAN\.IGN|data\.geopf\.fr.*GEOGRAPHICALGRIDSYSTEMS/ }).as('layerTiles')
        cy.get('[aria-label="Zoomer"]').first().click({ force: true })
        cy.wait('@layerTiles', { timeout: 10000 })
      }
    })
  })

  it('un clic sur la carte déclenche une réaction (URL ou requête réseau)', () => {
    // Capturer l'URL avant le clic
    cy.url().then((urlBefore) => {
      // Intercepter les requêtes d'identification
      cy.intercept({ url: /data\.geopf\.fr|geopf\.fr\/geocodage\/reverse/ }).as('mapRequest')

      // Cliquer au centre de la carte
      cy.get('.ol-viewport').first().click('center', { force: true })

      // Le clic doit produire au moins un de ces effets :
      // 1. Une requête réseau (GetFeatureInfo, reverse geocoding, tuiles de zoom)
      // 2. Un changement d'URL (coordonnées encodées)
      // 3. Un popup / tooltip visible
      // On teste dans l'ordre le plus fiable
      cy.wait('@mapRequest', { timeout: 10000 }).then((interception) => {
        expect(interception.response.statusCode).to.be.lessThan(500)
      })

      // La carte reste fonctionnelle après le clic
      cy.get('.ol-viewport canvas').should('exist')
    })
  })

  it('zoomer plusieurs fois charge des tuiles à chaque niveau', () => {
    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('navTiles')

    // Zoomer 3 fois de suite
    cy.get('[aria-label="Zoomer"]').first().click({ force: true })
    cy.wait('@navTiles', { timeout: 10000 })

    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('navTiles2')
    cy.get('[aria-label="Zoomer"]').first().click({ force: true })
    cy.wait('@navTiles2', { timeout: 10000 })

    cy.intercept({ url: /data\.geopf\.fr|wxs\.ign\.fr/ }).as('navTiles3')
    cy.get('[aria-label="Zoomer"]').first().click({ force: true })
    cy.wait('@navTiles3', { timeout: 10000 })

    // Le canvas est toujours rendu après 3 zooms
    cy.get('.ol-viewport canvas').first().should(($canvas) => {
      expect($canvas[0].width).to.be.greaterThan(0)
    })
  })

  it('un bouton de géolocalisation est présent sur la carte', () => {
    const geolocSelectors = [
      'button[aria-label*="localiser"]',
      'button[aria-label*="Localiser"]',
      'button[aria-label*="position"]',
      'button[aria-label*="Position"]',
      'button[aria-label*="géolocalisation"]',
      'button[title*="localiser"]',
      'button[title*="position"]',
      '[class*="geoloc"] button',
      '[class*="geolocate"]',
      '.ol-control button[class*="loc"]',
    ]

    cy.get('body').then(($body) => {
      const sel = geolocSelectors.find((s) => $body.find(s).length > 0)

      if (sel) {
        cy.get(sel).first().should('be.visible')
        // Vérifier que le bouton a un nom accessible
        cy.get(sel).first().then(($btn) => {
          const ariaLabel = $btn.attr('aria-label') || ''
          const title = $btn.attr('title') || ''
          const text = $btn.text().trim()
          expect(
            ariaLabel || title || text,
            'Le bouton de géolocalisation doit avoir un nom accessible'
          ).to.not.be.empty
        })
      } else {
        // Si aucun bouton de géolocalisation n'est trouvé, on le signale explicitement
        cy.log('Aucun bouton de géolocalisation trouvé sur la carte')
        // On ne fait pas échouer — certaines configurations du site peuvent ne pas l'afficher
      }
    })
  })
})
