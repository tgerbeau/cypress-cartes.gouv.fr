/**
 * error-pages.cy.js
 * Tests E2E — Pages d'erreur (404, routes invalides)
 * cartes.gouv.fr
 */

describe('Pages d\'erreur', { tags: '@nav' }, () => {
  it('une URL inexistante retourne un code 404', { tags: '@smoke' }, () => {
    cy.request({
      url: '/cette-page-nexiste-vraiment-pas-42',
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(404)
    })
  })

  it('la page 404 affiche un contenu lisible et pas une page vide', () => {
    cy.visit('/cette-page-nexiste-vraiment-pas-42', { failOnStatusCode: false })

    // La page ne doit pas être vide
    cy.get('body').should('not.be.empty')
    cy.get('body').invoke('text').should('have.length.greaterThan', 50)
  })

  it('la page 404 contient un moyen de revenir à l\'accueil', () => {
    cy.visit('/cette-page-nexiste-vraiment-pas-42', { failOnStatusCode: false })

    // Un lien vers l'accueil ou un bouton de retour doit exister
    cy.get('a[href="/"], a[href*="cartes.gouv.fr"]', { timeout: 10000 })
      .should('have.length.at.least', 1)
  })

  it('le header et le footer restent présents sur la page 404', () => {
    cy.visit('/cette-page-nexiste-vraiment-pas-42', { failOnStatusCode: false })

    // Le header DSFR doit être visible
    cy.get('header, .fr-header', { timeout: 10000 }).should('exist')

    // Le footer DSFR doit être visible
    cy.get('footer, .fr-footer', { timeout: 10000 }).should('exist')
  })

  it('une route invalide sous /rechercher-une-donnee retourne une erreur gérée', () => {
    cy.visit('/rechercher-une-donnee/dataset/DATASET_QUI_NEXISTE_PAS_999', { failOnStatusCode: false })

    // La page ne doit pas crasher (pas d'écran blanc)
    cy.get('body').should('not.be.empty')
  })

  it('les pages principales répondent en 200', { tags: '@smoke' }, () => {
    const pages = [
      'https://cartes.gouv.fr/',
      'https://cartes.gouv.fr/rechercher-une-donnee/',
      'https://cartes.gouv.fr/decouvrir/',
      'https://cartes.gouv.fr/mentions-legales',
      'https://cartes.gouv.fr/accessibilite',
    ]

    pages.forEach((page) => {
      cy.request({
        url: page,
        timeout: 15000,
      }).then((response) => {
        expect(response.status, `${page} doit répondre 200`).to.eq(200)
      })
    })
  })
})
