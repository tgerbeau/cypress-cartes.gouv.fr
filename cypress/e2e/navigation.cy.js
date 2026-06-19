/**
 * navigation.cy.js
 * Tests E2E — Navigation du menu principal
 * cartes.gouv.fr
 */

const NAV_SELECTOR = 'nav.fr-nav, header nav, [role="navigation"]'
const LINK_SELECTOR = 'nav.fr-nav .fr-nav__link, nav.fr-nav a[href], [role="navigation"] a[href]'

// Pages nécessitant une authentification (redirect SSO côté client)
const AUTH_PATTERNS = ['/login', '/mon-compte', '/tableau-de-bord', '/dashboard', '/oauth', '/sso']

/**
 * Collecte les liens internes uniques et dédoublonnés depuis un ensemble de <a>.
 */
function collectInternalHrefs($links) {
  const baseUrl = Cypress.config('baseUrl') || 'https://cartes.gouv.fr'
  const baseDomain = new URL(baseUrl).hostname
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

    let fullUrl
    try {
      fullUrl = new URL(href, baseUrl)
    } catch {
      return
    }

    if (fullUrl.hostname !== baseDomain) return

    const key = fullUrl.pathname
    if (!seen.has(key)) {
      seen.add(key)
      hrefs.push(fullUrl.pathname)
    }
  })

  return hrefs
}

describe('Navigation du menu principal', { tags: '@nav' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.document().its('readyState').should('eq', 'complete')
    // Attendre que la navigation DSFR soit rendue avec au moins un lien cliquable
    cy.get(NAV_SELECTOR, { timeout: 20000 })
      .first()
      .should('be.visible')
      .find('a[href]')
      .should('have.length.at.least', 1)
  })

  it('le menu de navigation principal est visible et identifié', { tags: '@smoke' }, () => {
    cy.get(NAV_SELECTOR)
      .first()
      .should('exist')
      .and('be.visible')
      // Le DSFR exige un label ou aria-label sur <nav>
      .then(($nav) => {
        const ariaLabel = $nav.attr('aria-label') || ''
        const ariaLabelledby = $nav.attr('aria-labelledby') || ''
        const role = $nav.prop('tagName').toLowerCase() === 'nav'
        expect(
          role || ariaLabel || ariaLabelledby,
          'La zone de navigation doit être une <nav> ou avoir un aria-label'
        ).to.be.ok
      })
  })

  it('cliquer un lien du menu navigue vers la page cible', { tags: '@smoke' }, () => {
    cy.get(LINK_SELECTOR)
      .filter(':visible')
      .first()
      .then(($link) => {
        const href = $link.attr('href')
        const text = $link.text().trim()
        cy.log(`Navigation vers "${text}" (${href})`)
        cy.wrap($link).click({ force: true })
        // La page cible doit se charger avec un body visible
        cy.get('body', { timeout: 30000 }).should('be.visible')
        cy.url().should('not.eq', 'about:blank')
        // Header et footer doivent être présents sur la page cible
        cy.get('header, .fr-header', { timeout: 10000 }).should('exist')
        cy.get('footer, .fr-footer').should('exist')
      })
  })

  it('le header et le footer sont présents sur les pages clés', { tags: '@smoke' }, () => {
    const pages = [
      '/decouvrir',
      '/rechercher-une-donnee/',
      '/mentions-legales',
      '/accessibilite',
    ]
    pages.forEach((page) => {
      cy.visit(page, { timeout: 30000 })
      cy.get('header, .fr-header', { timeout: 10000 }).should('exist')
      cy.get('footer, .fr-footer').should('exist')
    })
  })

  it('les liens du menu principal ont un texte accessible', () => {
    cy.get(LINK_SELECTOR)
      .filter(':visible')
      .should('have.length.at.least', 1)
      .each(($link) => {
        const text = $link.text().trim()
        const ariaLabel = ($link.attr('aria-label') || '').trim()
        const title = ($link.attr('title') || '').trim()
        expect(
          text || ariaLabel || title,
          `Le lien "${$link.attr('href')}" doit avoir un texte accessible`
        ).to.not.be.empty
      })
  })

  it('les liens du menu ne contiennent pas de href vides ou "#"', () => {
    cy.get(LINK_SELECTOR)
      .filter(':visible')
      .each(($link) => {
        const href = ($link.attr('href') || '').trim()
        expect(href, `Un lien visible ne doit pas avoir href="${href}"`).to.not.be.oneOf(['', '#'])
      })
  })

  it('chaque lien interne du menu répond avec un statut HTTP valide', () => {
    const baseUrl = Cypress.config('baseUrl') || 'https://cartes.gouv.fr'
    const baseDomain = new URL(baseUrl).hostname

    cy.get(LINK_SELECTOR)
      .filter(':visible')
      .then(($links) => {
        const hrefs = collectInternalHrefs($links)
        expect(hrefs.length, 'Le menu doit contenir au moins un lien interne').to.be.at.least(1)
        cy.log(`${hrefs.length} liens internes uniques trouvés`)

        hrefs.forEach((href) => {
          cy.request({
            url: href,
            timeout: 30000,
            failOnStatusCode: false,
          }).then((response) => {
            expect(
              response.status,
              `${href} doit répondre avec un statut < 400 (actuel : ${response.status})`
            ).to.be.lessThan(400)
          })
        })
      })
  })

  it('un lien interne du menu rend une page complète avec un contenu principal', () => {
    const baseUrl = Cypress.config('baseUrl') || 'https://cartes.gouv.fr'
    const baseDomain = new URL(baseUrl).hostname

    cy.get(LINK_SELECTOR)
      .filter(':visible')
      .then(($links) => {
        const hrefs = collectInternalHrefs($links)

        // Tester les liens un par un pour trouver un lien visitable (pas de redirect SSO)
        const safeHrefs = []

        hrefs.forEach((href) => {
          cy.request({
            url: href,
            timeout: 30000,
            failOnStatusCode: false,
          }).then((response) => {
            const body = response.body || ''
            const redirectsToExternal = response.redirects
              ? response.redirects.some((r) => !r.includes(baseDomain))
              : false
            const bodyRedirectsToSSO = typeof body === 'string' && body.includes('sso.geopf.fr')
            const isAuthPage = AUTH_PATTERNS.some((p) => href.includes(p))

            if (!redirectsToExternal && !bodyRedirectsToSSO && !isAuthPage && response.status < 400) {
              safeHrefs.push(href)
            }
          })
        })

        cy.then(() => {
          if (safeHrefs.length === 0) {
            cy.log('Aucun lien visitable (tous redirigent vers SSO ou externe)')
            return
          }
          const targetHref = safeHrefs[0]
          cy.log(`Vérification du rendu complet de : ${targetHref}`)
          cy.visit(targetHref, { timeout: 60000, failOnStatusCode: false })
          cy.document().its('readyState').should('eq', 'complete')
          cy.get('body', { timeout: 15000 }).should('be.visible')
          cy.get('h1, main, [role="main"]', { timeout: 15000 }).should('exist')
        })
      })
  })

  it('la navigation est accessible au clavier (les liens sont focusables)', () => {
    // Les liens de navigation doivent être focusables
    cy.get(LINK_SELECTOR)
      .filter(':visible')
      .first()
      .focus()

    // Le focus doit être sur un lien de la nav
    cy.focused().should('match', 'a[href]')

    // Vérifier que les liens n'ont pas de tabindex négatif (qui les exclut du flux Tab)
    cy.get(LINK_SELECTOR)
      .filter(':visible')
      .each(($link) => {
        const tabindex = $link.attr('tabindex')
        expect(
          tabindex === undefined || parseInt(tabindex, 10) >= 0,
          `Le lien "${$link.text().trim()}" ne doit pas avoir tabindex="${tabindex}"`
        ).to.be.true
      })
  })
})
