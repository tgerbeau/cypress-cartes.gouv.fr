const locations = require('../fixtures/locations.json')
const routes = require('../fixtures/routes.json')

const CREATE_MAP_PATTERN = /Créer\s+(votre\s+)?carte|Nouveau\s+projet/i
const SEARCH_RESULT_SELECTOR = '.GPautoCompleteList li, [role="listbox"] [role="option"], [class*="GPsearchResult"], [class*="suggestion"]'

/**
 * Ouvre l’espace de travail si l’éditeur affiche encore un écran d’entrée,
 * puis attend que l’UI principale de l’éditeur soit rendue.
 */
function openEditorWorkspaceIfNeeded() {
  cy.get('body', { timeout: 20000 }).then(($body) => {
    if (CREATE_MAP_PATTERN.test($body.text())) {
      cy.contains('button, a', CREATE_MAP_PATTERN).first().click({ force: true })
      cy.get('.ol-viewport, canvas, main, [role="main"]', { timeout: 20000 }).should('exist')
    }
  })
}

describe('Editeur Carto Tests', { tags: '@map' }, () => {
  beforeEach(() => {
    // Ignore uncaught exceptions from the application
    cy.on('uncaught:exception', () => false)

    cy.request({
      url: routes.editor,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.lessThan(400)
    })

    cy.visit(routes.editor, { timeout: 60000 })

    // Wait for the page to load
    cy.document().its('readyState').should('eq', 'complete')
    cy.get('body', { timeout: 20000 }).should('be.visible')
    openEditorWorkspaceIfNeeded()
  })

  it('ouvre l’éditeur du site principal et affiche un espace de travail', () => {
    cy.location('pathname').should('include', 'editeur')
    cy.get('.ol-viewport, canvas, main, [role="main"]', { timeout: 20000 }).should('exist')
  })

  it('le flux "Créer une carte" mène à une interface exploitable', () => {
    openEditorWorkspaceIfNeeded()
    cy.get('.ol-viewport, canvas, main, [role="main"]', { timeout: 20000 }).should('exist')
    cy.get('body').should(($body) => {
      const hasWorkspaceUi =
        $body.find('.ol-viewport, canvas, [role="toolbar"], [class*="toolbar"], [class*="layer"]').length > 0

      expect(hasWorkspaceUi, 'L’éditeur doit afficher une carte ou une barre d’outils').to.be.true
    })
  })

  it('la recherche de lieu de l’éditeur accepte une saisie réelle', () => {
    openEditorWorkspaceIfNeeded()
    cy.intercept({ url: /data\.geopf\.fr.*geocodage|completion/ }).as('editorGeocode')

    cy.getMapSearchInput()
      .clear({ force: true })
      .type(locations.toulouse.query, { force: true, delay: 100 })

    cy.wait('@editorGeocode', { timeout: 15000 }).its('response.statusCode').should('be.lessThan', 500)
    cy.get(SEARCH_RESULT_SELECTOR, { timeout: 10000 })
      .should('have.length.at.least', 1)
      .first()
      .click({ force: true })

    cy.getMapSearchInput()
      .invoke('val')
      .should('match', /Toulouse/i)
  })
})
