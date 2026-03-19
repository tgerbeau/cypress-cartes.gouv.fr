/**
 * navigation.cy.js
 * Tests E2E — Navigation du menu principal
 * cartes.gouv.fr
 */

describe('Navigation du menu principal', () => {
  beforeEach(() => {
    // Intercepter un appel réseau typique pour détecter la fin du chargement SPA
    cy.intercept('**/*.js').as('jsFiles')
    cy.visit('/', { timeout: 120000 })
    cy.document().its('readyState').should('eq', 'complete')
    cy.get('body', { timeout: 15000 }).should('be.visible')
    // Attendre que la navigation DSFR soit rendue ET que les liens soient présents
    cy.get('nav.fr-nav, header nav, [role="navigation"]', { timeout: 20000 })
      .first()
      .should('be.visible')
      .find('a[href]')
      .should('have.length.at.least', 1)
    // Laisser le framework JS (React/Next) terminer l'hydratation
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000)
  })

  it('le menu de navigation principal est visible', () => {
    // Le DSFR utilise nav.fr-nav pour la navigation principale
    cy.get('nav.fr-nav, header nav, [role="navigation"]')
      .first()
      .should('exist')
      .and('be.visible')
  })

  it('les liens du menu principal ont un texte accessible', () => {
    cy.get('nav.fr-nav .fr-nav__link, nav.fr-nav a, [role="navigation"] a')
      .filter(':visible')
      .should('have.length.at.least', 1)
      .each(($link) => {
        const text = $link.text().trim()
        const ariaLabel = ($link.attr('aria-label') || '').trim()
        expect(
          text || ariaLabel,
          `Le lien "${$link.attr('href')}" doit avoir un texte accessible`
        ).to.not.be.empty
      })
  })

  it('chaque lien principal du menu charge correctement la page', () => {
    // Collecter les hrefs des liens internes du menu de navigation
    cy.get('nav.fr-nav .fr-nav__link, nav.fr-nav a[href], [role="navigation"] a[href]')
      .filter(':visible')
      .then(($links) => {
        const baseUrl = Cypress.config('baseUrl') || 'https://cartes.gouv.fr'
        const baseDomain = new URL(baseUrl).hostname

        // Collecter et dédoublonner les liens internes uniquement
        const seen = new Set()
        const hrefs = []

        $links.each((_, link) => {
          const href = link.getAttribute('href')
          if (
            !href ||
            href === '#' ||
            href === '' ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:') ||
            href.startsWith('data:') ||
            href.startsWith('vbscript:')
          ) {
            return
          }

          // Résoudre l'URL complète pour filtrer les liens externes
          let fullUrl
          try {
            fullUrl = new URL(href, baseUrl)
          } catch {
            return // URL invalide, on ignore
          }

          // Ne garder que les liens internes (même domaine)
          if (fullUrl.hostname !== baseDomain) {
            return
          }

          // Dédoublonner par pathname (ignorer les query/hash)
          const key = fullUrl.pathname
          if (!seen.has(key)) {
            seen.add(key)
            hrefs.push(fullUrl.pathname)
          }
        })

        expect(hrefs.length, 'Le menu doit contenir au moins un lien interne').to.be.at.least(1)

        cy.log(`🔗 ${hrefs.length} liens internes uniques trouvés`)

        // Étape 1 : Vérifier que chaque URL répond en HTTP 200 (rapide et fiable)
        hrefs.forEach((href) => {
          cy.request({
            url: href,
            timeout: 30000,
            failOnStatusCode: false,
          }).then((response) => {
            expect(
              response.status,
              `La page ${href} doit répondre avec un statut 2xx ou 3xx`
            ).to.be.lessThan(400)
          })
        })

        // Étape 2 : Visiter le premier lien pour vérifier le rendu complet
        // (évite de naviguer sur toutes les pages, ce qui est lent et flaky)
        const firstHref = hrefs[0]
        cy.log(`📄 Vérification du rendu complet de : ${firstHref}`)
        cy.visit(firstHref, {
          timeout: 60000,
          failOnStatusCode: false,
        })
        cy.document().its('readyState').should('eq', 'complete')
        cy.get('body', { timeout: 15000 }).should('be.visible')
        cy.get('h1, main, [role="main"]', { timeout: 15000 }).should('exist')
      })
  })
})
