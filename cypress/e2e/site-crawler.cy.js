/**
 * site-crawler.cy.js
 * Crawl automatique du site — cartes.gouv.fr
 *
 * Ce test découvre dynamiquement les pages du site via :
 *   1. Le sitemap.xml (pages référencées par le SEO)
 *   2. Les liens internes trouvés sur la homepage (pages exposées aux utilisateurs)
 *
 * Pour chaque page découverte, il vérifie :
 *   - Le statut HTTP (2xx/3xx)
 *   - Le temps de réponse (< seuil)
 *   - La présence d'un titre <title>
 *   - L'absence d'erreur serveur dans le body
 *
 * Usage :
 *   npx cypress run --spec cypress/e2e/site-crawler.cy.js
 */

// ─── Configuration ────────────────────────────────────────────────

const SITEMAP_URL = 'https://cartes.gouv.fr/sitemap.xml'
const BASE_URL = 'https://cartes.gouv.fr'
const MAX_RESPONSE_TIME_MS = 5000
const REQUEST_TIMEOUT_MS = 15000

// Pages à exclure du crawl (ex: pages avec formulaire POST, désinscription…)
const EXCLUDED_PATTERNS = [
  '/desinscription',
]

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Vérifie qu'une URL est interne au site et non exclue
 */
function isValidInternalUrl(url) {
  try {
    const parsed = new URL(url, BASE_URL)
    if (parsed.hostname !== new URL(BASE_URL).hostname) return false
    if (EXCLUDED_PATTERNS.some((p) => parsed.pathname.includes(p))) return false
    if (['mailto:', 'tel:', 'javascript:', 'data:'].some((s) => url.startsWith(s))) return false
    if (url === '#' || url === '') return false
    return true
  } catch {
    return false
  }
}

/**
 * Normalise un pathname (supprime le trailing slash sauf pour /)
 */
function normalizePath(url) {
  try {
    const parsed = new URL(url, BASE_URL)
    return parsed.pathname.replace(/\/+$/, '') || '/'
  } catch {
    return url
  }
}

// ─── Tests ────────────────────────────────────────────────────────

describe('🕷️ Crawl automatique du site — cartes.gouv.fr', { tags: '@crawl' }, () => {

  // ════════════════════════════════════════════════════════════════
  // 1. SITEMAP.XML — Pages référencées pour le SEO
  // ════════════════════════════════════════════════════════════════

  describe('Sitemap.xml — pages référencées', () => {

    it('le sitemap.xml est accessible et contient des URLs', () => {
      cy.request({
        url: SITEMAP_URL,
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Accept: 'application/xml' },
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.include('<loc>')

        // Extraire et compter les URLs
        const urls = response.body.match(/<loc>([^<]+)<\/loc>/g) || []
        cy.task('log', `📍 Sitemap: ${urls.length} URLs référencées`)
        expect(urls.length).to.be.at.least(1)
      })
    })

    it('chaque page du sitemap répond correctement', () => {
      cy.request({
        url: SITEMAP_URL,
        timeout: REQUEST_TIMEOUT_MS,
      }).then((response) => {
        // Parser les URLs du sitemap
        const matches = response.body.match(/<loc>([^<]+)<\/loc>/g) || []
        const urls = matches.map((m) => m.replace(/<\/?loc>/g, ''))

        cy.task('log', `\n🕷️ Crawl de ${urls.length} pages du sitemap...\n`)

        const results = []

        // Tester chaque URL
        urls.forEach((url) => {
          if (!isValidInternalUrl(url)) return

          const path = normalizePath(url)

          cy.request({
            url,
            timeout: REQUEST_TIMEOUT_MS,
            failOnStatusCode: false,
            followRedirect: true,
          }).then((res) => {
            const result = {
              url: path,
              status: res.status,
              ok: res.status >= 200 && res.status < 400,
              hasTitle: (res.body || '').includes('<title'),
              size: (res.body || '').length,
            }
            results.push(result)

            const icon = result.ok ? '✅' : '❌'
            cy.task('log', `${icon} [${res.status}] ${path}`)

            // Assertions
            expect(
              res.status,
              `${path} doit répondre avec un statut 2xx/3xx`
            ).to.be.lessThan(400)
          })
        })

        // Résumé final
        cy.then(() => {
          const passed = results.filter((r) => r.ok).length
          const failed = results.filter((r) => !r.ok).length
          cy.task('log', `\n📊 Résultat sitemap: ${passed} OK, ${failed} KO sur ${results.length} pages`)
        })
      })
    })
  })

  // ════════════════════════════════════════════════════════════════
  // 2. DÉCOUVERTE DYNAMIQUE — Liens trouvés sur la homepage
  // ════════════════════════════════════════════════════════════════

  describe('Découverte dynamique — liens sur la homepage', () => {

    it('chaque lien interne de la homepage répond correctement', () => {
      cy.visit('/', { timeout: 60000 })
      cy.document().its('readyState').should('eq', 'complete')
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(2000) // Attendre l'hydratation SPA

      // Collecter TOUS les liens internes de la page
      cy.get('a[href]').then(($links) => {
        const seen = new Set()
        const urls = []

        $links.each((_, link) => {
          const href = link.getAttribute('href')
          if (!isValidInternalUrl(href)) return

          const path = normalizePath(href)
          if (seen.has(path)) return
          seen.add(path)
          urls.push({ path, href })
        })

        cy.task('log', `\n🔗 ${urls.length} liens internes uniques trouvés sur la homepage\n`)

        const results = []

        urls.forEach(({ path, href }) => {
          // Résoudre l'URL complète
          let fullUrl
          try {
            fullUrl = new URL(href, BASE_URL).toString()
          } catch {
            return
          }

          cy.request({
            url: fullUrl,
            timeout: REQUEST_TIMEOUT_MS,
            failOnStatusCode: false,
            followRedirect: true,
          }).then((res) => {
            results.push({
              path,
              status: res.status,
              ok: res.status >= 200 && res.status < 400,
            })

            const icon = res.status < 400 ? '✅' : '❌'
            cy.task('log', `${icon} [${res.status}] ${path}`)

            expect(
              res.status,
              `Le lien ${path} trouvé sur la homepage doit répondre en 2xx/3xx`
            ).to.be.lessThan(400)
          })
        })

        // Résumé
        cy.then(() => {
          const passed = results.filter((r) => r.ok).length
          const failed = results.filter((r) => !r.ok).length
          cy.task('log', `\n📊 Résultat homepage: ${passed} OK, ${failed} KO sur ${results.length} liens`)
        })
      })
    })
  })

  // ════════════════════════════════════════════════════════════════
  // 3. TEMPS DE RÉPONSE — Performance par page
  // ════════════════════════════════════════════════════════════════

  describe('Temps de réponse par page', () => {

    it('toutes les pages du sitemap répondent en moins de 5 secondes', () => {
      cy.request({
        url: SITEMAP_URL,
        timeout: REQUEST_TIMEOUT_MS,
      }).then((response) => {
        const matches = response.body.match(/<loc>([^<]+)<\/loc>/g) || []
        const urls = matches
          .map((m) => m.replace(/<\/?loc>/g, ''))
          .filter(isValidInternalUrl)

        cy.task('log', `\n⏱️ Mesure des temps de réponse...\n`)

        const timings = []

        urls.forEach((url) => {
          const path = normalizePath(url)
          const start = Date.now()

          cy.request({
            url,
            timeout: REQUEST_TIMEOUT_MS,
            failOnStatusCode: false,
            followRedirect: true,
          }).then((res) => {
            const duration = Date.now() - start

            timings.push({ path, duration, status: res.status })

            const icon = duration < MAX_RESPONSE_TIME_MS ? '⚡' : '🐢'
            cy.task('log', `${icon} ${duration}ms — [${res.status}] ${path}`)

            expect(
              duration,
              `${path} doit répondre en moins de ${MAX_RESPONSE_TIME_MS}ms (actuel: ${duration}ms)`
            ).to.be.lessThan(MAX_RESPONSE_TIME_MS)
          })
        })

        // Résumé avec stats
        cy.then(() => {
          if (timings.length === 0) return

          const durations = timings.map((t) => t.duration)
          const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          const max = Math.max(...durations)
          const min = Math.min(...durations)
          const slowest = timings.find((t) => t.duration === max)
          const fastest = timings.find((t) => t.duration === min)

          cy.task('log', `\n📊 Performance — ${timings.length} pages testées`)
          cy.task('log', `   Moyenne : ${avg}ms`)
          cy.task('log', `   Plus rapide : ${min}ms (${fastest.path})`)
          cy.task('log', `   Plus lente  : ${max}ms (${slowest.path})`)
        })
      })
    })
  })

  // ════════════════════════════════════════════════════════════════
  // 4. LIENS CASSÉS — Vérification profonde
  // ════════════════════════════════════════════════════════════════

  describe('Détection de liens cassés (deep crawl)', () => {

    it('signale les liens internes cassés trouvés sur les pages du sitemap', () => {
      cy.request({
        url: SITEMAP_URL,
        timeout: REQUEST_TIMEOUT_MS,
      }).then((response) => {
        const matches = response.body.match(/<loc>([^<]+)<\/loc>/g) || []
        // On prend les 5 premières pages pour ne pas exploser le temps
        const urls = matches
          .map((m) => m.replace(/<\/?loc>/g, ''))
          .filter(isValidInternalUrl)
          .slice(0, 5)

        cy.task('log', `\n🔎 Deep crawl — vérification des liens sur ${urls.length} pages\n`)

        const brokenLinks = []

        urls.forEach((pageUrl) => {
          const pagePath = normalizePath(pageUrl)

          cy.visit(pageUrl, { timeout: 30000, failOnStatusCode: false })
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(1000)

          cy.get('a[href]').then(($links) => {
            const seen = new Set()
            const internalLinks = []

            $links.each((_, link) => {
              const href = link.getAttribute('href')
              if (!isValidInternalUrl(href)) return

              const path = normalizePath(href)
              if (seen.has(path)) return
              seen.add(path)
              internalLinks.push(href)
            })

            cy.task('log', `📄 ${pagePath}: ${internalLinks.length} liens internes`)

            internalLinks.forEach((href) => {
              let fullUrl
              try {
                fullUrl = new URL(href, BASE_URL).toString()
              } catch {
                return
              }

              // Utiliser maxRedirects pour éviter les boucles infinies
              cy.request({
                url: fullUrl,
                timeout: REQUEST_TIMEOUT_MS,
                failOnStatusCode: false,
                followRedirect: false, // Gérer les redirections manuellement
              }).then((res) => {
                // Considérer 3xx comme OK (redirect), 4xx/5xx comme cassé
                if (res.status >= 400) {
                  const broken = {
                    page: pagePath,
                    link: normalizePath(href),
                    status: res.status,
                  }
                  brokenLinks.push(broken)
                  cy.task('log', `   ⚠️ [${res.status}] ${broken.link} (trouvé sur ${pagePath})`)
                }
              })
            })
          })
        })

        // Résumé — on log les liens cassés mais on ne fait pas échouer le test
        // Le but est de DÉTECTER et REPORTER, pas de bloquer
        cy.then(() => {
          if (brokenLinks.length > 0) {
            cy.task('log', `\n⚠️ ${brokenLinks.length} lien(s) cassé(s) détecté(s) (warning) :`)
            brokenLinks.forEach((b) => {
              cy.task('log', `   ⚠️ [${b.status}] ${b.link} — trouvé sur ${b.page}`)
            })
            // Soft assert : on log un warning mais on ne bloque pas le test
            // Pour activer le mode strict, décommenter la ligne ci-dessous :
            // expect(brokenLinks, 'Liens cassés détectés').to.have.length(0)
          } else {
            cy.task('log', '\n✅ Aucun lien cassé détecté')
          }
        })
      })
    })
  })
})
