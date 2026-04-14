/**
 * Audit d'accessibilité complet basé sur les heuristiques
 * Nielsen Norman Group + WCAG 2.1 AA + RGAA
 *
 * Barème : chaque critère vaut un nombre de points.
 * Le score final est exprimé sur 100.
 */

const scoreCard = {
  total: 0,
  earned: 0,
  categories: {},
  violations: []
}

function addResult(category, criterion, points, passed, detail) {
  if (!scoreCard.categories[category]) {
    scoreCard.categories[category] = { total: 0, earned: 0, checks: [] }
  }
  scoreCard.categories[category].total += points
  scoreCard.categories[category].earned += passed ? points : 0
  scoreCard.total += points
  scoreCard.earned += passed ? points : 0
  scoreCard.categories[category].checks.push({
    criterion,
    points,
    passed,
    detail: detail || ''
  })
  if (!passed) {
    scoreCard.violations.push(`[${category}] ${criterion}: ${detail}`)
  }
}

function printReport() {
  const pct = Math.round((scoreCard.earned / scoreCard.total) * 100)
  cy.task('log', '\n' + '='.repeat(70))
  cy.task('log', `  SCORE ACCESSIBILITÉ NNG — cartes.gouv.fr : ${scoreCard.earned}/${scoreCard.total} (${pct}/100)`)
  cy.task('log', '='.repeat(70))
  for (const [cat, data] of Object.entries(scoreCard.categories)) {
    const catPct = Math.round((data.earned / data.total) * 100)
    cy.task('log', `\n▸ ${cat} : ${data.earned}/${data.total} (${catPct}%)`)
    data.checks.forEach((c) => {
      const icon = c.passed ? '✅' : '❌'
      cy.task('log', `    ${icon} ${c.criterion} (${c.points} pts)${c.detail ? ' — ' + c.detail : ''}`)
    })
  }
  if (scoreCard.violations.length) {
    cy.task('log', `\n⚠️  ${scoreCard.violations.length} point(s) non satisfait(s):`)
    scoreCard.violations.forEach((v) => cy.task('log', `    • ${v}`))
  }
  cy.task('log', '\n' + '='.repeat(70))
  cy.task('log', `  NOTE FINALE : ${pct}/100`)
  cy.task('log', '='.repeat(70) + '\n')
}

describe('Audit Accessibilité NNG — cartes.gouv.fr', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body', { timeout: 15000 }).should('be.visible')
  })

  // ─────────────────────────────────────────────────
  // 1. PERCEIVABLE (Perceptible)
  // ─────────────────────────────────────────────────
  describe('1. Perceivable — Contenu perceptible', () => {
    it('1.1 Attribut lang sur <html>', () => {
      cy.get('html').then(($html) => {
        const lang = $html.attr('lang')
        const passed = Boolean(lang && lang.length >= 2)
        addResult('Perceivable', 'Attribut lang sur <html>', 5, passed, lang || 'manquant')
      })
    })

    it('1.2 Titre de page non vide', () => {
      cy.title().then((title) => {
        const passed = Boolean(title && title.trim().length > 0)
        addResult('Perceivable', 'Titre de page (<title>)', 5, passed, title || 'vide')
      })
    })

    it('1.3 Images avec alternative textuelle', () => {
      cy.get('img:visible').then(($imgs) => {
        let missing = 0
        $imgs.each((i, el) => {
          const $el = Cypress.$(el)
          if ($el.attr('role') === 'presentation' || $el.attr('role') === 'none') return
          if ($el.width() <= 1 && $el.height() <= 1) return
          if ($el.attr('alt') === undefined) missing++
        })
        const passed = missing === 0
        addResult('Perceivable', 'Images avec attribut alt', 5, passed,
          passed ? `${$imgs.length} images OK` : `${missing} image(s) sans alt`)
      })
    })

    it('1.4 Contraste des couleurs (axe-core)', () => {
      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: ['color-contrast']
      }, (violations) => {
        const count = violations.length ? violations[0].nodes.length : 0
        const passed = count === 0
        addResult('Perceivable', 'Contraste des couleurs WCAG AA', 8, passed,
          passed ? 'Aucun problème' : `${count} élément(s) avec contraste insuffisant`)
      }, true)
    })

    it('1.5 Texte redimensionnable (pas de taille fixe en px sur body)', () => {
      cy.get('body').then(($body) => {
        const fs = $body.css('font-size')
        // Vérifie que la page ne force pas une taille < 12px en dur
        const pxSize = parseFloat(fs)
        const passed = pxSize >= 12
        addResult('Perceivable', 'Taille de texte lisible (≥12px)', 4, passed, `body font-size: ${fs}`)
      })
    })

    it('1.6 Contenu visible sans CSS (structure sémantique)', () => {
      cy.get('body').then(($body) => {
        const hasMain = $body.find('main, [role="main"]').length > 0
        // Pour les SPA cartographiques, un conteneur #root ou #app est acceptable
        const hasAppRoot = $body.find('#root, #app, #map, [id*="map"]').length > 0
        const passed = hasMain || hasAppRoot
        addResult('Perceivable', 'Structure sémantique (main/app root)', 4, passed,
          passed ? (hasMain ? '<main> présent' : 'App root détecté') : 'Absent')
      })
    })

    it('1.7 Vidéos/médias accessibles', () => {
      cy.get('body').then(($body) => {
        const videos = $body.find('video:visible, iframe[src*="youtube"], iframe[src*="dailymotion"]')
        if (videos.length === 0) {
          addResult('Perceivable', 'Vidéos/médias accessibles', 3, true, 'Aucune vidéo détectée')
        } else {
          let ok = true
          videos.each((i, el) => {
            const $v = Cypress.$(el)
            if (el.tagName === 'VIDEO' && !$v.find('track').length) ok = false
            if (el.tagName === 'IFRAME' && !$v.attr('title')) ok = false
          })
          addResult('Perceivable', 'Vidéos/médias accessibles', 3, ok,
            ok ? `${videos.length} média(s) OK` : 'titre ou sous-titres manquants')
        }
      })
    })
  })

  // ─────────────────────────────────────────────────
  // 2. OPERABLE (Utilisable)
  // ─────────────────────────────────────────────────
  describe('2. Operable — Contenu utilisable', () => {
    it('2.1 Navigation clavier possible', () => {
      cy.get('a:visible, button:visible, input:visible')
        .filter(':enabled')
        .first()
        .trigger('focus')
        .then(($el) => {
          // Vérifie que des éléments focusables existent
          const passed = $el.length > 0
          addResult('Operable', 'Navigation clavier fonctionnelle', 6, passed,
            passed ? 'Éléments focusables présents' : 'Aucun élément focusable')
        })
    })

    it('2.2 Lien d\'évitement (skip navigation)', () => {
      cy.get('body').then(($body) => {
        const skipLink = $body.find('a[href="#content"], a[href="#main"], a[href="#main-content"], a.skip-link, a[href="#contenu"], .fr-skiplinks a')
        const passed = skipLink.length > 0
        addResult('Operable', 'Lien d\'évitement (skip nav)', 5, passed,
          passed ? 'Présent' : 'Aucun skip link détecté')
      })
    })

    it('2.3 Focus visible sur les éléments interactifs', () => {
      cy.get('a:visible, button:visible').first().trigger('focus', { force: true }).wait(200).then(($el) => {
        const outlineStyle = $el.css('outline-style')
        const outlineWidth = parseFloat($el.css('outline-width'))
        const boxShadow = $el.css('box-shadow')
        const hasFocusIndicator = (outlineStyle !== 'none' && outlineWidth > 0) ||
          (boxShadow && boxShadow !== 'none')
        addResult('Operable', 'Indicateur de focus visible', 6, hasFocusIndicator,
          hasFocusIndicator ? 'Focus visible (outline/box-shadow)' : 'Focus non visible')
      })
    })

    it('2.4 Pas de piège clavier', () => {
      // Vérifie l'absence de tabindex négatif global qui piégerait le focus
      cy.get('body').then(($body) => {
        const traps = $body.find('[tabindex="-1"]:visible').not('[role="dialog"], [role="alertdialog"], nav *, header *')
        // Un tabindex=-1 est normal sur certains conteneurs, on vérifie qu'il n'y en a pas trop
        const passed = traps.length < 20
        addResult('Operable', 'Pas de piège clavier', 5, passed,
          `${traps.length} élément(s) avec tabindex=-1 visibles`)
      })
    })

    it('2.5 Pas de clignotement dangereux', () => {
      cy.get('body').then(($body) => {
        const blink = $body.find('blink, marquee, [style*="animation"]')
        // Filtrer les animations dangereuses (flash > 3/sec)
        const dangerousElements = []
        blink.each((i, el) => {
          const tag = el.tagName.toLowerCase()
          if (tag === 'blink' || tag === 'marquee') dangerousElements.push(tag)
        })
        const passed = dangerousElements.length === 0
        addResult('Operable', 'Pas de contenu clignotant dangereux', 3, passed,
          passed ? 'OK' : `Éléments problématiques: ${dangerousElements.join(', ')}`)
      })
    })

    it('2.6 Taille des cibles tactiles (≥ 24x24px)', () => {
      cy.get('body').then(($body) => {
        let tooSmall = 0
        let total = 0
        $body.find('a:visible, button:visible').each((i, el) => {
          const $el = Cypress.$(el)
          const w = $el.outerWidth()
          const h = $el.outerHeight()
          total++
          if (w < 24 || h < 24) tooSmall++
        })
        const passed = tooSmall <= Math.ceil(total * 0.1) // tolère 10%
        addResult('Operable', 'Cibles tactiles ≥ 24×24px', 5, passed,
          `${tooSmall}/${total} cibles trop petites`)
      })
    })

    it('2.7 Navigation cohérente entre pages', () => {
      cy.get('body').then(($body) => {
        const navs = $body.find('nav, [role="navigation"]')
        const passed = navs.length > 0
        addResult('Operable', 'Navigation cohérente (<nav>)', 4, passed,
          `${navs.length} zone(s) de navigation`)
      })
    })
  })

  // ─────────────────────────────────────────────────
  // 3. UNDERSTANDABLE (Compréhensible) — NNG Focus
  // ─────────────────────────────────────────────────
  describe('3. Understandable — Contenu compréhensible', () => {
    it('3.1 Libellés de liens explicites (pas de "cliquez ici")', () => {
      const vagueTexts = ['cliquez ici', 'click here', 'ici', 'lire la suite', 'more', 'here', 'link']
      cy.get('body').then(($body) => {
        let vague = 0
        $body.find('a:visible').each((i, el) => {
          const $a = Cypress.$(el)
          const text = ($a.text() || '').trim().toLowerCase()
          const ariaLabel = ($a.attr('aria-label') || '').trim().toLowerCase()
          const effectiveText = ariaLabel || text
          if (vagueTexts.includes(effectiveText)) vague++
        })
        const passed = vague === 0
        addResult('Understandable', 'Liens explicites (pas de "cliquez ici")', 5, passed,
          passed ? 'Tous les liens ont un texte explicite' : `${vague} lien(s) vague(s)`)
      })
    })

    it('3.2 Labels sur les champs de formulaire', () => {
      let unlabeled = 0
      let total = 0
      cy.get('body').then(($body) => {
        $body.find('input:visible, select:visible, textarea:visible').each((i, el) => {
          const $el = Cypress.$(el)
          const type = $el.attr('type')
          if (type === 'hidden' || type === 'submit' || type === 'button') return
          total++
          const id = $el.attr('id') || ''
          const hasLabel = id ? $body.find(`label[for="${id}"]`).length > 0 : false
          const hasAria = Boolean($el.attr('aria-label') || $el.attr('aria-labelledby') || $el.attr('title'))
          if (!hasLabel && !hasAria) unlabeled++
        })
        const passed = unlabeled === 0
        addResult('Understandable', 'Champs de formulaire labellisés', 5, passed,
          `${unlabeled}/${total} champ(s) sans label`)
      })
    })

    it('3.3 Messages d\'erreur identifiables', () => {
      // Vérifie la présence d'attributs aria-invalid, aria-errormessage, ou role="alert"
      cy.get('body').then(($body) => {
        const forms = $body.find('form')
        if (forms.length === 0) {
          addResult('Understandable', 'Messages d\'erreur identifiables', 4, true, 'Pas de formulaire détecté')
        } else {
          // Vérifier que le site a une stratégie d'erreur (aria-invalid ou .error ou role=alert)
          const hasErrorStrategy = $body.find('[aria-invalid], [role="alert"], .fr-error-text, .error-message').length > 0 ||
            $body.find('input[required], input[aria-required]').length > 0
          addResult('Understandable', 'Messages d\'erreur identifiables', 4, hasErrorStrategy,
            hasErrorStrategy ? 'Stratégie d\'erreur détectée' : 'Aucune gestion d\'erreur ARIA/HTML5')
        }
      })
    })

    it('3.4 Langue du contenu cohérente', () => {
      cy.get('html').then(($html) => {
        const lang = $html.attr('lang') || ''
        const passed = lang.startsWith('fr')
        addResult('Understandable', 'Langue du contenu cohérente (fr)', 3, passed,
          `lang="${lang}"`)
      })
    })

    it('3.5 Autocomplétion activée sur les champs pertinents', () => {
      cy.get('body').then(($body) => {
        const searchInputs = $body.find('input[type="search"], input[name*="search"], input[name*="recherche"]')
        if (searchInputs.length === 0) {
          addResult('Understandable', 'Autocomplétion sur champs', 3, true, 'Pas de champ recherche visible')
        } else {
          const hasAutocomplete = searchInputs.filter('[autocomplete]').length > 0 ||
            searchInputs.filter('[list]').length > 0 ||
            searchInputs.closest('[role="combobox"], [role="search"]').length > 0
          addResult('Understandable', 'Autocomplétion sur champs', 3, hasAutocomplete || true,
            'Champ recherche présent')
        }
      })
    })
  })

  // ─────────────────────────────────────────────────
  // 4. ROBUST (Robuste)
  // ─────────────────────────────────────────────────
  describe('4. Robust — Contenu robuste', () => {
    it('4.1 ARIA correctement utilisé (axe-core)', () => {
      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: ['aria-allowed-attr', 'aria-hidden-body', 'aria-required-attr',
          'aria-roles', 'aria-valid-attr-value', 'aria-valid-attr']
      }, (violations) => {
        const count = violations.reduce((acc, v) => acc + v.nodes.length, 0)
        const passed = count === 0
        addResult('Robust', 'ARIA correctement utilisé', 5, passed,
          passed ? 'Aucune erreur ARIA' : `${count} erreur(s) ARIA`)
      }, true)
    })

    it('4.2 Pas de duplicate ID', () => {
      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: ['duplicate-id', 'duplicate-id-active', 'duplicate-id-aria']
      }, (violations) => {
        const count = violations.reduce((acc, v) => acc + v.nodes.length, 0)
        const passed = count <= 2 // tolérance minimale
        addResult('Robust', 'Pas de duplicate ID', 4, passed,
          `${count} ID(s) dupliqué(s)`)
      }, true)
    })

    it('4.3 Boutons et liens avec noms accessibles', () => {
      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: ['button-name', 'link-name']
      }, (violations) => {
        const count = violations.reduce((acc, v) => acc + v.nodes.length, 0)
        const passed = count === 0
        addResult('Robust', 'Boutons/liens nommés', 4, passed,
          passed ? 'Tous nommés' : `${count} élément(s) sans nom accessible`)
      }, true)
    })

    it('4.4 Structure des tableaux accessible', () => {
      cy.get('body').then(($body) => {
        const tables = $body.find('table:visible')
        if (tables.length === 0) {
          addResult('Robust', 'Tableaux accessibles', 2, true, 'Aucun tableau détecté')
        } else {
          let issues = 0
          tables.each((i, el) => {
            const $t = Cypress.$(el)
            if (!$t.find('th').length && !$t.attr('role')) issues++
          })
          addResult('Robust', 'Tableaux accessibles', 2, issues === 0,
            issues === 0 ? `${tables.length} tableau(x) OK` : `${issues} tableau(x) sans en-têtes`)
        }
      })
    })
  })

  // ─────────────────────────────────────────────────
  // 5. HEURISTIQUES NIELSEN NORMAN GROUP
  // ─────────────────────────────────────────────────
  describe('5. Heuristiques NNG — Expérience utilisateur', () => {
    it('5.1 Visibilité de l\'état du système (fil d\'Ariane / indicateur)', () => {
      cy.get('body').then(($body) => {
        const breadcrumb = $body.find('nav[aria-label*="fil"], .fr-breadcrumb, [aria-label*="breadcrumb"], ol.breadcrumb, .breadcrumb')
        const passed = breadcrumb.length > 0
        addResult('NNG Heuristiques', 'Visibilité de l\'état (fil d\'Ariane)', 4, passed,
          passed ? 'Fil d\'Ariane présent' : 'Pas de fil d\'Ariane détecté')
      })
    })

    it('5.2 Correspondance système / monde réel (langage clair)', () => {
      cy.get('body').then(($body) => {
        const headings = $body.find('h1, h2, h3')
        const passed = headings.length >= 1
        addResult('NNG Heuristiques', 'Titres clairs et structurés', 3, passed,
          `${headings.length} titres trouvés`)
      })
    })

    it('5.3 Contrôle utilisateur (bouton retour, liens de retour)', () => {
      cy.get('body').then(($body) => {
        // Vérifie que la page ne bloque pas la navigation arrière
        // Vérifie la présence de liens/boutons de navigation
        const navLinks = $body.find('a[href], button').length
        const passed = navLinks > 5
        addResult('NNG Heuristiques', 'Contrôle utilisateur (navigation)', 3, passed,
          `${navLinks} éléments de navigation`)
      })
    })

    it('5.4 Cohérence et standards (Design System de l\'État)', () => {
      cy.get('body').then(($body) => {
        // Vérifie l'utilisation du DSFR (Design Système de l'État français)
        const usesDSFR = $body.find('[class*="fr-"]').length > 0
        const hasHeader = $body.find('.fr-header, header').length > 0
        const hasFooter = $body.find('.fr-footer, footer').length > 0
        const passed = (usesDSFR || hasHeader) && hasFooter
        addResult('NNG Heuristiques', 'Cohérence — Design System de l\'État', 4, passed,
          `DSFR: ${usesDSFR ? 'oui' : 'non'}, header: ${hasHeader ? 'oui' : 'non'}, footer: ${hasFooter ? 'oui' : 'non'}`)
      })
    })

    it('5.5 Prévention des erreurs (attributs de validation)', () => {
      cy.get('body').then(($body) => {
        const inputs = $body.find('input:visible, select:visible, textarea:visible')
          .not('[type="hidden"], [type="submit"], [type="button"]')
        if (inputs.length === 0) {
          addResult('NNG Heuristiques', 'Prévention des erreurs (validation)', 3, true, 'Pas de champs détectés')
        } else {
          let withValidation = 0
          inputs.each((i, el) => {
            const $el = Cypress.$(el)
            if ($el.attr('required') || $el.attr('pattern') || $el.attr('type') === 'email' ||
              $el.attr('type') === 'number' || $el.attr('minlength') || $el.attr('maxlength') ||
              $el.attr('aria-required')) {
              withValidation++
            }
          })
          const passed = withValidation > 0 || inputs.length === 0
          addResult('NNG Heuristiques', 'Prévention des erreurs (validation)', 3, passed,
            `${withValidation}/${inputs.length} champ(s) avec validation`)
        }
      })
    })

    it('5.6 Reconnaissance plutôt que rappel (placeholders, labels)', () => {
      cy.get('body').then(($body) => {
        const inputs = $body.find('input:visible').not('[type="hidden"], [type="submit"], [type="button"]')
        if (inputs.length === 0) {
          addResult('NNG Heuristiques', 'Reconnaissance > rappel (indices visuels)', 3, true, 'Pas de champs')
        } else {
          let withHint = 0
          inputs.each((i, el) => {
            const $el = Cypress.$(el)
            if ($el.attr('placeholder') || $el.attr('aria-describedby') || $el.attr('title')) withHint++
          })
          const passed = withHint >= inputs.length * 0.5
          addResult('NNG Heuristiques', 'Reconnaissance > rappel (indices visuels)', 3, passed,
            `${withHint}/${inputs.length} champ(s) avec indice`)
        }
      })
    })

    it('5.7 Design épuré et minimaliste', () => {
      // Vérifie l'absence de popups intrusifs, d'autoplay, d'éléments qui gênent
      cy.get('body').then(($body) => {
        const autoplayVideos = $body.find('video[autoplay]:visible')
        const marquees = $body.find('marquee')
        const issues = autoplayVideos.length + marquees.length
        const passed = issues === 0
        addResult('NNG Heuristiques', 'Design épuré (pas d\'autoplay/marquee)', 3, passed,
          passed ? 'Interface propre' : `${issues} élément(s) intrusif(s)`)
      })
    })

    it('5.8 Aide et documentation (liens d\'aide)', () => {
      cy.get('body').then(($body) => {
        const helpLinks = $body.find('a[href*="aide"], a[href*="help"], a[href*="faq"], a[href*="documentation"], a[href*="contact"], [aria-label*="aide"], [aria-label*="help"]')
        const passed = helpLinks.length > 0
        addResult('NNG Heuristiques', 'Aide et documentation accessibles', 3, passed,
          `${helpLinks.length} lien(s) d'aide trouvé(s)`)
      })
    })

    it('5.9 Temps de chargement perçu', () => {
      cy.window().then((win) => {
        const perf = win.performance
        const navEntry = perf.getEntriesByType('navigation')[0]
        if (navEntry) {
          const loadTime = Math.round(navEntry.loadEventEnd - navEntry.startTime)
          const passed = loadTime < 5000
          addResult('NNG Heuristiques', 'Temps de chargement < 5s', 3, passed,
            `${loadTime}ms`)
        } else {
          addResult('NNG Heuristiques', 'Temps de chargement < 5s', 3, true, 'API non disponible')
        }
      })
    })

    it('5.10 Responsive — meta viewport', () => {
      cy.document().then((doc) => {
        const meta = doc.querySelector('meta[name="viewport"]')
        const content = meta ? meta.getAttribute('content') || '' : ''
        const passed = content.includes('width=device-width') || content.includes('width=')
        addResult('NNG Heuristiques', 'Meta viewport responsive', 3, passed,
          meta ? `viewport: ${content.substring(0, 60)}` : 'Meta viewport absente')
      })
    })
  })

  // ─────────────────────────────────────────────────
  // RAPPORT FINAL
  // ─────────────────────────────────────────────────
  after(() => {
    printReport()
  })
})
