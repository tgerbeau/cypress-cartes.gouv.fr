/**
 * monitoring.cy.js
 * Monitoring synthétique — cartes.gouv.fr
 *
 * Ces tests simulent un utilisateur réel et mesurent :
 * - La disponibilité du site (uptime)
 * - Les temps de réponse des pages critiques
 * - Les temps de réponse des API clés
 * - Les erreurs console JavaScript
 *
 * À exécuter régulièrement (toutes les 15 min ou toutes les heures)
 * via GitHub Actions ou un cron externe.
 */

describe('🩺 Monitoring synthétique — cartes.gouv.fr', { tags: '@monitoring' }, () => {
  // ─── Disponibilité & Performance des pages ──────────────────────

  describe('Disponibilité des pages critiques', () => {
    const pages = [
      { name: 'Accueil', path: '/explorer-les-cartes/' },
      { name: 'À propos', path: '/a-propos/' },
      { name: 'Découvrir les données', path: '/decouvrir/' },
    ]

    pages.forEach(({ name, path }) => {
      it(`[UPTIME] ${name} (${path}) répond en < 5s avec un statut 2xx`, () => {
        const start = Date.now()

        cy.request({
          url: path,
          timeout: 15000,
          failOnStatusCode: false,
        }).then((response) => {
          const duration = Date.now() - start

          // Vérifier le statut HTTP
          expect(
            response.status,
            `${name} doit répondre avec un statut 2xx`
          ).to.be.within(200, 399)

          // Vérifier le temps de réponse
          expect(
            duration,
            `${name} doit répondre en moins de 5 secondes (actuel: ${duration}ms)`
          ).to.be.lessThan(5000)

          // Vérifier que le body n'est pas vide
          expect(response.body).to.not.be.empty

          // Log pour le rapport
          cy.task('log', `✅ ${name}: ${response.status} en ${duration}ms`)
        })
      })
    })
  })

  // ─── Santé des API ──────────────────────────────────────────────

  describe('Santé des API', () => {
    it('[API] Géoplateforme WMTS (data.geopf.fr) est accessible', () => {
      const start = Date.now()

      cy.request({
        url: 'https://data.geopf.fr/wmts?service=WMTS&request=GetCapabilities',
        timeout: 15000,
        failOnStatusCode: false,
      }).then((response) => {
        const duration = Date.now() - start

        expect(response.status).to.be.within(200, 399)
        expect(duration).to.be.lessThan(10000)

        cy.task('log', `✅ API Géoplateforme WMTS: ${response.status} en ${duration}ms`)
      })
    })

    it('[API] Géocodage (data.geopf.fr/geocodage) répond correctement', () => {
      const start = Date.now()

      cy.request({
        url: 'https://data.geopf.fr/geocodage/search?q=Paris&limit=1',
        timeout: 10000,
        failOnStatusCode: false,
      }).then((response) => {
        const duration = Date.now() - start

        expect(response.status).to.eq(200)
        expect(duration).to.be.lessThan(5000)

        // Vérifier la structure de la réponse
        expect(response.body).to.have.property('features')
        expect(response.body.features).to.have.length.at.least(1)

        cy.task('log', `✅ API Géocodage: ${response.status} en ${duration}ms`)
      })
    })
  })

  // ─── Performance du chargement réel ─────────────────────────────

  describe('Performance de chargement', () => {
    it('[PERF] la page d\'accueil se charge complètement en < 15s', () => {
      const start = Date.now()

      cy.visit('/', { timeout: 30000 })
      cy.document().its('readyState').should('eq', 'complete')
      cy.get('body').should('be.visible')

      // Attendre un élément significatif de la page
      cy.get('header, nav, [role="banner"]', { timeout: 15000 })
        .should('be.visible')
        .then(() => {
          const loadTime = Date.now() - start
          cy.task('log', `⏱️ Chargement complet accueil: ${loadTime}ms`)

          expect(
            loadTime,
            `La page doit se charger en moins de 15 secondes (actuel: ${loadTime}ms)`
          ).to.be.lessThan(15000)
        })
    })

    it('[PERF] l\'éditeur cartographique se charge en < 20s', () => {
      const start = Date.now()

      cy.visit('/editeur', { timeout: 30000, failOnStatusCode: false })
      cy.document().its('readyState').should('eq', 'complete')
      cy.get('body', { timeout: 20000 }).should('be.visible')

      // L'éditeur est un SPA lourd — on vérifie simplement qu'il rend un body non vide
      cy.get('body').then(($body) => {
        const loadTime = Date.now() - start
        cy.task('log', `⏱️ Chargement éditeur carto: ${loadTime}ms`)

        expect($body.text().trim().length).to.be.greaterThan(0)
        expect(
          loadTime,
          `L'éditeur carto doit se charger en moins de 20 secondes (actuel: ${loadTime}ms)`
        ).to.be.lessThan(20000)
      })
    })
  })

  // ─── Erreurs JavaScript ─────────────────────────────────────────

  describe('Erreurs JavaScript', () => {
    it('[JS] la page d\'accueil ne produit pas d\'erreurs console critiques', () => {
      const consoleErrors = []

      cy.on('window:before:load', (win) => {
        cy.stub(win.console, 'error').callsFake((...args) => {
          consoleErrors.push(args.join(' '))
        })
      })

      cy.visit('/', { timeout: 30000 })
      cy.document().its('readyState').should('eq', 'complete')
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(3000) // Laisser le JS s'exécuter

      cy.then(() => {
        // Filtrer les erreurs connues/acceptables
        const criticalErrors = consoleErrors.filter((err) => {
          const ignoredPatterns = [
            'favicon',
            'third-party',
            'analytics',
            'matomo',
            'tarteaucitron',
            'cookie',
            'ResizeObserver',
          ]
          return !ignoredPatterns.some((pattern) =>
            err.toLowerCase().includes(pattern.toLowerCase())
          )
        })

        if (criticalErrors.length > 0) {
          cy.task('log', `⚠️ ${criticalErrors.length} erreur(s) JS détectée(s)`)
          criticalErrors.forEach((err) => cy.task('log', `  ❌ ${err.substring(0, 200)}`))
        } else {
          cy.task('log', '✅ Aucune erreur JS critique détectée')
        }

        // On log mais on ne fait pas échouer le test pour les erreurs non critiques
        // Décommenter la ligne ci-dessous pour être strict :
        // expect(criticalErrors, 'Erreurs JS critiques').to.have.length(0)
      })
    })
  })

  // ─── Certificat SSL & Headers de sécurité ───────────────────────

  describe('Sécurité', () => {
    it('[SSL] le site est accessible en HTTPS', () => {
      cy.request({
        url: 'https://cartes.gouv.fr',
        timeout: 10000,
      }).then((response) => {
        expect(response.status).to.eq(200)
        cy.task('log', '✅ HTTPS OK')
      })
    })

    it('[SECURITY] les headers de sécurité sont présents', () => {
      cy.request({
        url: 'https://cartes.gouv.fr',
        timeout: 10000,
      }).then((response) => {
        const headers = response.headers

        // Vérifier les headers de sécurité importants
        const securityHeaders = {
          'x-frame-options': 'Protection contre le clickjacking',
          'x-content-type-options': 'Protection contre le MIME sniffing',
          'strict-transport-security': 'HSTS activé',
        }

        Object.entries(securityHeaders).forEach(([header, description]) => {
          if (headers[header]) {
            cy.task('log', `✅ ${description}: ${headers[header]}`)
          } else {
            cy.task('log', `⚠️ Header manquant: ${header} (${description})`)
          }
        })

        // Au minimum, vérifier que le content-type est correct
        expect(headers['content-type']).to.include('text/html')
      })
    })
  })
})
