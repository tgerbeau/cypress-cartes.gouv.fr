/**
 * commands.js
 * Commandes Cypress custom — cypress-cartes.gouv.fr
 */

// ─── Cookies ───────────────────────────────────────────────────────────────────

/**
 * Accepte la bannière de cookies si elle est présente
 */
Cypress.Commands.add('acceptCookies', () => {
  cy.get('body').then(($body) => {
    const btn = $body.find(
      '[data-testid="accept-cookies"], button[aria-label*="accepter"], button[aria-label*="cookies"], .fr-consent-banner button'
    )
    if (btn.length) {
      btn.first().click()
    }
  })
})

// ─── Authentification ──────────────────────────────────────────────────────────

/**
 * Simule une session utilisateur connectée via stub API
 * Usage : cy.loginAs({ email: 'agent@test.gouv.fr', prenom: 'Jean', nom: 'Dupont' })
 */
Cypress.Commands.add('loginAs', (user = {}) => {
  const defaultUser = { id: '1', email: 'agent@test.gouv.fr', prenom: 'Jean', nom: 'Dupont' }
  const userData = { ...defaultUser, ...user }

  cy.setCookie('session', 'fake-valid-session-token')
  cy.intercept('GET', '**/api/me', { statusCode: 200, body: userData }).as('getMe')
})

/**
 * Supprime la session (déconnexion simulée)
 */
Cypress.Commands.add('logout', () => {
  cy.clearCookies()
  cy.clearLocalStorage()
})

// ─── Carte interactive ─────────────────────────────────────────────────────────

/**
 * Attend que la carte soit entièrement chargée (canvas ou viewport visible)
 * Usage : cy.waitForMap()
 */
Cypress.Commands.add('waitForMap', (timeout = 15000) => {
  cy.get('[data-testid="map-container"], #map, .ol-viewport, .maplibregl-canvas', { timeout })
    .should('be.visible')
  cy.get('.ol-zoom, .maplibregl-ctrl-zoom-in', { timeout }).should('exist')
})

/**
 * Zoome in N fois via le bouton +
 * Usage : cy.zoomIn(3)
 */
Cypress.Commands.add('zoomIn', (times = 1) => {
  for (let i = 0; i < times; i++) {
    cy.get('[aria-label="Zoom in"], [aria-label="Zoomer"], .ol-zoom-in').first().click()
    cy.wait(300)
  }
})

/**
 * Zoome out N fois via le bouton -
 * Usage : cy.zoomOut(2)
 */
Cypress.Commands.add('zoomOut', (times = 1) => {
  for (let i = 0; i < times; i++) {
    cy.get('[aria-label="Zoom out"], [aria-label="Dézoomer"], .ol-zoom-out').first().click()
    cy.wait(300)
  }
})

/**
 * Ouvre le panneau de couches et toggle une couche par son index
 * Usage : cy.toggleLayer(0) // active/désactive la première couche
 */
Cypress.Commands.add('toggleLayer', (index = 0) => {
  cy.get('[data-testid="layers-panel"], [aria-label*="couche"]').first().click()
  cy.get('[data-testid="layer-toggle"], input[type="checkbox"]').eq(index).click({ force: true })
})

// ─── Catalogue & données ───────────────────────────────────────────────────────

/**
 * Recherche un terme dans le catalogue de données
 * Usage : cy.searchCatalogue('parcelle')
 */
Cypress.Commands.add('searchCatalogue', (term) => {
  cy.get('input[type="search"], input[placeholder*="recherch"], [data-testid="catalogue-search"]')
    .first()
    .clear()
    .type(term)
  cy.get('[data-testid="dataset-item"], .dataset-item, article', { timeout: 8000 })
    .should('exist')
})

/**
 * Navigue vers la fiche du premier résultat du catalogue
 * Usage : cy.openFirstDataset()
 */
Cypress.Commands.add('openFirstDataset', () => {
  cy.visit('/catalogue', { failOnStatusCode: false })
  cy.get('[data-testid="dataset-item"] a, .dataset-item a, article a', { timeout: 10000 })
    .first()
    .click()
  cy.get('h1, [data-testid="dataset-title"]').should('exist')
})

// ─── Accessibilité ─────────────────────────────────────────────────────────────

/**
 * Vérifie que tous les liens d'une page ont un texte ou aria-label non vide
 * Usage : cy.checkLinksHaveText()
 */
Cypress.Commands.add('checkLinksHaveText', () => {
  cy.get('a').each($a => {
    const text = $a.text().trim()
    const ariaLabel = $a.attr('aria-label')
    const ariaLabelledBy = $a.attr('aria-labelledby')
    expect(
      text || ariaLabel || ariaLabelledBy,
      `Un lien sans texte ni aria-label a été trouvé : ${$a.attr('href')}`
    ).to.not.be.empty
  })
})

/**
 * Vérifie que toutes les images ont un attribut alt (peut être vide pour les images décoratives)
 * Usage : cy.checkImagesHaveAlt()
 */
Cypress.Commands.add('checkImagesHaveAlt', () => {
  cy.get('img').each($img => {
    expect($img.attr('alt'), `Image sans attribut alt : ${$img.attr('src')}`).to.not.be.undefined
  })
})

/**
 * Navigue dans la page uniquement au clavier (Tab) et vérifie les focus visibles
 * Usage : cy.checkKeyboardNavigation(5) // tabule 5 fois
 */
Cypress.Commands.add('checkKeyboardNavigation', (steps = 5) => {
  cy.get('body').focus()
  for (let i = 0; i < steps; i++) {
    cy.focused().then($el => {
      // L'élément focusé doit exister et être visible
      expect($el.length).to.be.greaterThan(0)
    })
    cy.tab ? cy.tab() : cy.focused().tab()
  }
})

// ─── Formulaires ──────────────────────────────────────────────────────────────

/**
 * Remplit un champ par son label (texte) — plus robuste que les sélecteurs CSS
 * Usage : cy.fillByLabel('Adresse email', 'test@gouv.fr')
 */
Cypress.Commands.add('fillByLabel', (labelText, value) => {
  cy.contains('label', labelText).invoke('attr', 'for').then(id => {
    if (id) {
      cy.get(`#${id}`).clear().type(value)
    } else {
      cy.contains('label', labelText)
        .closest('[class*="field"], [class*="form-group"], div')
        .find('input, textarea, select')
        .first()
        .clear()
        .type(value)
    }
  })
})

// Soumet un formulaire et attend une réponse réseau
// Usage : cy.submitForm('POST', '**/contact**')
Cypress.Commands.add('submitForm', (method = 'POST', urlPattern = '**') => {
  cy.intercept(method, urlPattern).as('formSubmit')
  cy.get('button[type="submit"], input[type="submit"]').first().click()
  return cy.wait('@formSubmit', { timeout: 10000 })
})
