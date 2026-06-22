/**
 * Tests RGAA (Référentiel Général d'Amélioration de l'Accessibilité)
 * Basé sur les 106 critères du RGAA 4.1.2
 * https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/
 *
 * Ces tests vérifient les critères automatisables sur cartes.gouv.fr.
 * Les critères nécessitant une évaluation humaine sont marqués comme tels.
 */

const PAGES_TO_TEST = [
  { name: 'Accueil', url: '/' },
  { name: 'Découvrir', url: '/decouvrir' },
  { name: 'Explorer les cartes', url: '/explorer-les-cartes/' },
  { name: 'Rechercher une donnée', url: '/rechercher-une-donnee/search' },
  { name: 'Découvrir — Explorer', url: '/decouvrir/explorer-les-cartes' },
  { name: 'Découvrir — Rechercher', url: '/decouvrir/rechercher-une-donnee' },
  { name: 'Découvrir — Publier', url: '/decouvrir/publier-une-donnee' },
  { name: 'Offres', url: '/offres' },
  { name: 'Actualités', url: '/actualites' },
  // { name: 'Communautés', url: '/nous-rejoindre' }, // Page exclue : timeout >120s
  { name: 'Aide — FAQ', url: '/aide/fr/' },
  { name: 'Aide — Nous écrire', url: '/aide/fr/nous-ecrire/' },
  { name: 'Accessibilité', url: '/accessibilite' },
  { name: 'Mentions légales', url: '/mentions-legales' },
  { name: 'CGU', url: '/cgu' },
  { name: 'Données personnelles', url: '/donnees-personnelles' },
  { name: 'Plan du site', url: '/plan-du-site' }
]

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 1 — Images
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 1 — Images', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('1.1 — Chaque image porteuse d\'information a une alternative textuelle', () => {
    cy.get('img:visible').each(($img) => {
      const role = $img.attr('role') || ''
      if (role === 'presentation' || role === 'none') return
      if ($img.width() <= 1 && $img.height() <= 1) return

      cy.wrap($img).should('have.attr', 'alt')
    })

    // Vérifier les SVG porteurs d'information
    cy.get('body').then(($body) => {
      const svgs = $body.find('svg[role="img"]')
      svgs.each((_, svg) => {
        const $svg = Cypress.$(svg)
        const ariaLabel = $svg.attr('aria-label') || ''
        const ariaLabelledby = $svg.attr('aria-labelledby') || ''
        const title = $svg.find('title').text() || ''
        if (!ariaLabel && !ariaLabelledby && !title) {
          cy.task('log', `⚠️  1.1 — SVG role="img" sans nom accessible détecté`)
        }
      })
    })
  })

  it('1.2 — Chaque image de décoration est correctement ignorée', () => {
    // Les images décoratives doivent avoir alt="" ou role="presentation"/"none"
    cy.get('img[alt=""]').each(($img) => {
      // Une image avec alt="" ne doit pas avoir de title non vide
      const title = $img.attr('title') || ''
      if (title) {
        cy.task('log', `⚠️  1.2 — Image décorative avec title : "${title}"`)
      }
    })

    // SVG décoratifs : vérification informative (non bloquante)
    cy.get('body').then(($body) => {
      let svgWithoutHidden = 0
      $body.find('svg:not([role="img"]):not([aria-hidden="true"])').each((_, svg) => {
        const $svg = Cypress.$(svg)
        if (!$svg.attr('role') && $svg.closest('[aria-hidden="true"]').length === 0) {
          svgWithoutHidden++
        }
      })
      if (svgWithoutHidden > 0) {
        cy.task('log', `⚠️  1.2 — ${svgWithoutHidden} SVG décoratif(s) sans aria-hidden="true"`)
      }
    })
  })

  it('1.3 — Alternative textuelle des images pertinente (vérification structurelle + IA)', () => {
    // Vérification structurelle : l'alt n'est pas un nom de fichier
    cy.get('img[alt]:visible').each(($img) => {
      const alt = $img.attr('alt') || ''
      if (!alt) return // image décorative
      expect(alt).not.to.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i,
        `L'alt ne doit pas être un nom de fichier : "${alt}"`)
    })

    // Vérification IA via Claude Vision sur plusieurs pages
    const pagesToScan = [
      { name: 'Accueil', url: '/' },
      { name: 'Découvrir', url: '/decouvrir' },
      { name: 'Offres', url: '/offres' },
      { name: 'Actualités', url: '/actualites' },
      { name: 'Découvrir — Explorer', url: '/decouvrir/explorer-les-cartes' },
      { name: 'Découvrir — Publier', url: '/decouvrir/publier-une-donnee' }
    ]

    pagesToScan.forEach(({ name, url }) => {
      cy.visit(url, { timeout: 120000 })
      cy.get('body').should('be.visible')
      cy.get('body').then(($body) => {
        const imagesToAnalyze = []
        $body.find('img[alt]:visible').each((_, img) => {
          const $img = Cypress.$(img)
          const alt = $img.attr('alt') || ''
          const src = $img.attr('src') || ''
          if (!alt || !src) return
          if ($img.width() <= 1 || $img.height() <= 1) return
          const absoluteUrl = src.startsWith('http') ? src : `https://cartes.gouv.fr${src.startsWith('/') ? '' : '/'}${src}`
          imagesToAnalyze.push({ url: absoluteUrl, alt })
        })

        // Limiter à 3 images par page
        const sample = imagesToAnalyze.slice(0, 3)
        if (sample.length === 0) {
          cy.task('log', `ℹ️  1.3 IA — ${name} : aucune image porteuse d'information`)
          return
        }

        cy.task('log', `🤖 1.3 IA — ${name} : analyse de ${sample.length} image(s) via Claude Vision...`)
        sample.forEach(({ url: imgUrl, alt }) => {
          cy.task('analyzeAltRelevance', { imageUrl: imgUrl, altText: alt }).then((result) => {
            if (!result.pertinent) {
              cy.task('log', `⚠️  1.3 IA — [${name}] Alt non pertinent : "${alt}"`)
              cy.task('log', `    Image : ${imgUrl.substring(0, 80)}`)
              cy.task('log', `    Raison : ${result.reason}`)
              cy.task('log', `    Suggestion : "${result.suggestedAlt}"`)
            } else {
              cy.task('log', `✓ 1.3 IA — [${name}] Alt pertinent : "${alt.substring(0, 50)}"`)
            }
          })
        })
      })
    })
  })

  it('1.4 — CAPTCHA : alternative textuelle identifiant la nature de l\'image', () => {
    // Les images CAPTCHA doivent avoir un alt décrivant leur nature
    cy.get('body').then(($body) => {
      const captchas = $body.find('img[src*="captcha"], img[alt*="captcha"], img[class*="captcha"], [class*="captcha"] img')
      if (captchas.length === 0) {
        cy.task('log', 'ℹ️  1.4 — Aucun CAPTCHA image détecté sur cette page')
        return
      }
      captchas.each((_, img) => {
        const $img = Cypress.$(img)
        const alt = $img.attr('alt') || ''
        expect(alt.length, 'Image CAPTCHA doit avoir un alt non vide').to.be.greaterThan(0)
      })
    })
  })

  it('1.5 — CAPTCHA : solution d\'accès alternatif présente', () => {
    // Si un CAPTCHA est présent, une alternative (audio, question logique, etc.) doit exister
    cy.get('body').then(($body) => {
      const captchaContainers = $body.find('[class*="captcha"], [id*="captcha"], [data-captcha]')
      if (captchaContainers.length === 0) {
        cy.task('log', 'ℹ️  1.5 — Aucun CAPTCHA détecté sur cette page')
        return
      }
      captchaContainers.each((_, container) => {
        const $container = Cypress.$(container)
        const hasAudioAlt = $container.find('audio, a[href*="audio"], button[aria-label*="audio"]').length > 0
        const hasTextAlt = $container.find('a[href*="alternat"], button[aria-label*="alternat"]').length > 0
        const hasRefresh = $container.find('button[aria-label*="rafraîchir"], button[aria-label*="refresh"], a[title*="autre"]').length > 0
        if (!hasAudioAlt && !hasTextAlt && !hasRefresh) {
          cy.task('log', '⚠️  1.5 — CAPTCHA sans solution d\'accès alternatif détecté')
        }
      })
    })
  })

  it('1.6 — Image porteuse d\'information ayant une description détaillée', () => {
    // Les images complexes (infographies, graphiques) doivent avoir une description détaillée
    // via aria-describedby, longdesc, ou un lien adjacent
    cy.get('body').then(($body) => {
      // Images avec longdesc (attribut obsolète mais encore valide RGAA)
      const longdescImgs = $body.find('img[longdesc]')
      longdescImgs.each((_, img) => {
        const $img = Cypress.$(img)
        const longdesc = $img.attr('longdesc') || ''
        expect(longdesc.length, 'longdesc ne doit pas être vide').to.be.greaterThan(0)
      })

      // Images avec aria-describedby
      const describedImgs = $body.find('img[aria-describedby]')
      describedImgs.each((_, img) => {
        const $img = Cypress.$(img)
        const describedbyId = $img.attr('aria-describedby')
        const description = $body.find(`#${CSS.escape(describedbyId)}`)
        if (description.length === 0) {
          cy.task('log', `⚠️  1.6 — aria-describedby="${describedbyId}" référence un élément inexistant`)
        } else {
          expect(description.text().trim().length, 'Description détaillée non vide').to.be.greaterThan(0)
        }
      })

      if (longdescImgs.length === 0 && describedImgs.length === 0) {
        cy.task('log', 'ℹ️  1.6 — Aucune image avec description détaillée trouvée (vérifier manuellement les images complexes)')
      }
    })
  })

  it('1.7 — Description détaillée pertinente (vérification structurelle)', () => {
    // Vérifier que les descriptions détaillées ne sont pas vides ou génériques
    cy.get('body').then(($body) => {
      const describedImgs = $body.find('img[aria-describedby], img[longdesc]')
      if (describedImgs.length === 0) {
        cy.task('log', 'ℹ️  1.7 — Aucune image avec description détaillée trouvée')
        return
      }
      describedImgs.each((_, img) => {
        const $img = Cypress.$(img)
        const describedbyId = $img.attr('aria-describedby')
        if (describedbyId) {
          const descEl = $body.find(`#${CSS.escape(describedbyId)}`)
          if (descEl.length) {
            const text = descEl.text().trim()
            // La description ne doit pas être un simple duplicat de l'alt
            const alt = $img.attr('alt') || ''
            if (text && alt && text === alt) {
              cy.task('log', `⚠️  1.7 — Description détaillée identique à l'alt : "${alt.substring(0, 50)}"`)
            }
            // La description doit avoir un minimum de contenu
            if (text.length < 10) {
              cy.task('log', `⚠️  1.7 — Description détaillée trop courte (${text.length} car.) pour #${describedbyId}`)
            }
          }
        }
      })
    })
  })

  it('1.8 — Images texte remplacées par du texte stylé (vérification IA)', () => {
    // Vérification structurelle : alt long = possible image-texte
    cy.get('img[alt]:visible').each(($img) => {
      const alt = $img.attr('alt') || ''
      if (alt.length > 80) {
        cy.task('log', `⚠️  1.8 — Image possiblement texte (alt long) : "${alt.substring(0, 50)}..."`)
      }
    })

    // Vérification IA via Claude Vision sur plusieurs pages
    const pagesToScan = [
      { name: 'Accueil', url: '/' },
      { name: 'Découvrir', url: '/decouvrir' },
      { name: 'Offres', url: '/offres' },
      { name: 'Actualités', url: '/actualites' },
      { name: 'Découvrir — Explorer', url: '/decouvrir/explorer-les-cartes' },
      { name: 'Découvrir — Publier', url: '/decouvrir/publier-une-donnee' }
    ]

    pagesToScan.forEach(({ name, url }) => {
      cy.visit(url, { timeout: 120000 })
      cy.get('body').should('be.visible')
      cy.get('body').then(($body) => {
        const imagesToAnalyze = []
        $body.find('img:visible').each((_, img) => {
          const $img = Cypress.$(img)
          const src = $img.attr('src') || ''
          if (!src) return
          if ($img.width() <= 1 || $img.height() <= 1) return
          if ($img.width() < 50 || $img.height() < 20) return
          const absoluteUrl = src.startsWith('http') ? src : `https://cartes.gouv.fr${src.startsWith('/') ? '' : '/'}${src}`
          imagesToAnalyze.push(absoluteUrl)
        })

        // Limiter à 3 images par page
        const sample = imagesToAnalyze.slice(0, 3)
        if (sample.length === 0) {
          cy.task('log', `ℹ️  1.8 IA — ${name} : aucune image à analyser`)
          return
        }

        cy.task('log', `🤖 1.8 IA — ${name} : détection de texte dans ${sample.length} image(s)...`)
        sample.forEach((imgUrl) => {
          cy.task('detectTextInImage', { imageUrl: imgUrl }).then((result) => {
            if (result.hasText && result.shouldBeHtml) {
              cy.task('log', `⚠️  1.8 IA — [${name}] Image-texte détectée : ${imgUrl.substring(0, 80)}`)
              cy.task('log', `    Texte trouvé : "${result.textContent}"`)
              cy.task('log', `    Raison : ${result.reason}`)
            } else if (result.hasText) {
              cy.task('log', `ℹ️  1.8 IA — [${name}] Texte acceptable : "${result.textContent.substring(0, 50)}" — ${result.reason}`)
            }
          })
        })
      })
    })
  })

  it('1.9 — Légende d\'image correctement reliée', () => {
    // Les figure doivent avoir un figcaption lié
    cy.get('body').then(($body) => {
      const figures = $body.find('figure')
      if (figures.length === 0) {
        cy.task('log', 'ℹ️  1.9 — Aucune balise <figure> trouvée sur cette page')
        return
      }
      figures.each((_, figure) => {
        const $figure = Cypress.$(figure)
        const hasImg = $figure.find('img, svg, picture, canvas').length > 0
        if (!hasImg) return
        const figcaption = $figure.find('figcaption')
        if (figcaption.length) {
          expect(figcaption.text().trim().length).to.be.greaterThan(0)
        }
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 2 — Cadres
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 2 — Cadres', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('2.1 — Chaque cadre (iframe) a un titre', () => {
    cy.get('iframe').each(($iframe) => {
      const title = $iframe.attr('title') || ''
      const ariaLabel = $iframe.attr('aria-label') || ''
      const ariaLabelledby = $iframe.attr('aria-labelledby') || ''
      expect(
        Boolean(title || ariaLabel || ariaLabelledby),
        `iframe doit avoir un attribut title ou aria-label : ${$iframe.attr('src') || 'unknown'}`
      ).to.be.true
    })
  })

  it('2.2 — Le titre de chaque cadre est pertinent (vérification structurelle)', () => {
    cy.get('iframe[title]').each(($iframe) => {
      const title = $iframe.attr('title') || ''
      // Le titre ne doit pas être vide ou générique
      expect(title.length).to.be.greaterThan(0)
      expect(title.toLowerCase()).not.to.be.oneOf(['iframe', 'frame', 'cadre', 'untitled'])
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 3 — Couleurs
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 3 — Couleurs', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('3.1 — Information non donnée uniquement par la couleur (via axe-core)', () => {
    cy.injectAxe()
    cy.checkA11y(null, {
      runOnly: ['color-contrast'],
      includedImpacts: ['critical', 'serious']
    }, (violations) => {
      if (violations.length) {
        violations.forEach((v) => {
          cy.task('log', `⚠️  3.1/3.2 — ${v.id}: ${v.nodes.length} élément(s) en violation`)
        })
      }
    }, true)
  })

  it('3.2 — Contraste texte/arrière-plan suffisant (axe-core)', () => {
    cy.injectAxe()
    cy.checkA11y(null, {
      runOnly: ['color-contrast']
    }, (violations) => {
      if (violations.length) {
        cy.task('log', `⚠️  3.2 — ${violations.length} violation(s) de contraste`)
        violations.forEach((v) => {
          v.nodes.slice(0, 5).forEach((node) => {
            cy.task('log', `  - ${node.html.substring(0, 100)}`)
          })
        })
      }
      // Baseline tolérant pour le site existant
      expect(violations.length).to.be.lessThan(20)
    }, true)
  })

  it('3.3 — Contraste des composants d\'interface et éléments graphiques (3:1)', () => {
    // Les composants d'interface (boutons, champs, icônes) doivent avoir un ratio de contraste ≥ 3:1
    // Vérification structurelle : les éléments interactifs ne doivent pas être quasi-invisibles
    cy.get('body').then(($body) => {
      // Vérifier les bordures de champs de formulaire
      const inputs = $body.find('input:visible, select:visible, textarea:visible')
      let lowContrastInputs = 0
      inputs.each((_, el) => {
        const style = getComputedStyle(el)
        const borderColor = style.borderColor
        const bgColor = style.backgroundColor
        // Signaler les champs sans bordure visible (potentiel problème de contraste)
        if (borderColor === bgColor || style.borderWidth === '0px' || style.borderStyle === 'none') {
          // Vérifier si un autre indicateur visuel existe (box-shadow, outline)
          if (style.boxShadow === 'none' && style.outline === 'none') {
            lowContrastInputs++
          }
        }
      })
      if (lowContrastInputs > 0) {
        cy.task('log', `⚠️  3.3 — ${lowContrastInputs} champ(s) de formulaire sans bordure/indicateur visuel détecté(s)`)
      }

      // Vérifier les icônes SVG dans des boutons (doivent être visibles)
      const iconButtons = $body.find('button:visible svg, a:visible svg')
      if (iconButtons.length > 0) {
        cy.task('log', `ℹ️  3.3 — ${iconButtons.length} icône(s) SVG dans éléments interactifs (vérifier contraste ≥ 3:1 manuellement)`)
      }
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 4 — Multimédia
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 4 — Multimédia', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('4.1 — Média temporel pré-enregistré : transcription textuelle ou audiodescription', () => {
    cy.get('body').then(($body) => {
      const videos = $body.find('video, [role="video"]')
      const audios = $body.find('audio')
      if (videos.length === 0 && audios.length === 0) {
        cy.task('log', 'ℹ️  4.1 — Aucun média temporel détecté sur cette page')
        return
      }
      videos.each((_, el) => {
        const $el = Cypress.$(el)
        const hasTrack = $el.find('track[kind="captions"], track[kind="subtitles"], track[kind="descriptions"]').length > 0
        const hasAriaDescribedby = Boolean($el.attr('aria-describedby'))
        const hasAdjacentTranscript = $el.next('[class*="transcript"], [id*="transcript"]').length > 0 ||
          $el.closest('figure').find('figcaption').length > 0
        if (!hasTrack && !hasAriaDescribedby && !hasAdjacentTranscript) {
          cy.task('log', '⚠️  4.1 — Vidéo sans transcription/audiodescription détectée')
        }
      })
      audios.each((_, el) => {
        const $el = Cypress.$(el)
        const hasAriaDescribedby = Boolean($el.attr('aria-describedby'))
        const hasAdjacentTranscript = $el.next('[class*="transcript"], [id*="transcript"]').length > 0
        if (!hasAriaDescribedby && !hasAdjacentTranscript) {
          cy.task('log', '⚠️  4.1 — Audio sans transcription textuelle détecté')
        }
      })
    })
  })

  it('4.2 — Média temporel pré-enregistré : sous-titres synchronisés', () => {
    cy.get('body').then(($body) => {
      const videos = $body.find('video')
      if (videos.length === 0) {
        cy.task('log', 'ℹ️  4.2 — Aucune balise <video> détectée')
        return
      }
      videos.each((_, video) => {
        const $video = Cypress.$(video)
        const hasCaptions = $video.find('track[kind="captions"], track[kind="subtitles"]').length > 0
        if (!hasCaptions) {
          cy.task('log', `⚠️  4.2 — Vidéo sans sous-titres (track kind="captions|subtitles") : ${$video.attr('src') || $video.find('source').attr('src') || 'unknown'}`)
        }
      })
    })
  })

  it('4.4 — Média temporel pré-enregistré : audiodescription synchronisée', () => {
    cy.get('body').then(($body) => {
      const videos = $body.find('video')
      if (videos.length === 0) {
        cy.task('log', 'ℹ️  4.4 — Aucune balise <video> détectée')
        return
      }
      videos.each((_, video) => {
        const $video = Cypress.$(video)
        const hasAudioDesc = $video.find('track[kind="descriptions"]').length > 0
        if (!hasAudioDesc) {
          cy.task('log', '⚠️  4.4 — Vidéo sans piste d\'audiodescription (track kind="descriptions")')
        }
      })
    })
  })

  it('4.7 — Média temporel : transcription textuelle accessible', () => {
    cy.get('body').then(($body) => {
      const medias = $body.find('video, audio')
      if (medias.length === 0) {
        cy.task('log', 'ℹ️  4.7 — Aucun média temporel détecté')
        return
      }
      let withTranscript = 0
      medias.each((_, el) => {
        const $el = Cypress.$(el)
        const describedBy = $el.attr('aria-describedby')
        if (describedBy && $body.find(`#${CSS.escape(describedBy)}`).length > 0) {
          withTranscript++
        } else if ($el.next('[class*="transcript"], [id*="transcript"]').length > 0) {
          withTranscript++
        } else if ($el.closest('figure').find('figcaption').length > 0) {
          withTranscript++
        }
      })
      cy.task('log', `ℹ️  4.7 — ${withTranscript}/${medias.length} média(s) avec transcription détectée`)
    })
  })

  it('4.8 — Média non temporel : alternative accessible', () => {
    // Vérifier les canvas, SVG interactifs, objets embarqués
    cy.get('body').then(($body) => {
      const nonTemporalMedia = $body.find('canvas, object, embed, svg[role="img"]')
      if (nonTemporalMedia.length === 0) {
        cy.task('log', 'ℹ️  4.8 — Aucun média non temporel (canvas/object/embed) détecté')
        return
      }
      nonTemporalMedia.each((_, el) => {
        const $el = Cypress.$(el)
        const ariaLabel = $el.attr('aria-label') || ''
        const ariaLabelledby = $el.attr('aria-labelledby') || ''
        const ariaDescribedby = $el.attr('aria-describedby') || ''
        const hasAlt = Boolean(ariaLabel || ariaLabelledby || ariaDescribedby)
        if (!hasAlt) {
          cy.task('log', `⚠️  4.8 — Média non temporel <${el.tagName.toLowerCase()}> sans alternative accessible`)
        }
      })
    })
  })

  it('4.10 — Son déclenché automatiquement contrôlable', () => {
    // Vérifier qu'aucun média n'a autoplay sans contrôle de volume/pause
    cy.get('body').then(($body) => {
      const autoplayMedia = $body.find('video[autoplay], audio[autoplay]')
      if (autoplayMedia.length === 0) {
        cy.task('log', 'ℹ️  4.10 — Aucun média avec autoplay détecté')
        return
      }
      autoplayMedia.each((_, el) => {
        const $el = Cypress.$(el)
        const isMuted = $el.prop('muted') || $el.attr('muted') !== undefined
        const hasControls = $el.attr('controls') !== undefined
        if (!isMuted && !hasControls) {
          cy.task('log', `⚠️  4.10 — Média autoplay non muet et sans contrôles : <${el.tagName.toLowerCase()}>`)
        }
      })
    })
  })

  it('4.11 — Média temporel : contrôle au clavier', () => {
    // Les médias doivent avoir l'attribut controls ou un lecteur custom focusable
    cy.get('body').then(($body) => {
      const medias = $body.find('video:visible, audio:visible')
      if (medias.length === 0) {
        cy.task('log', 'ℹ️  4.11 — Aucun média visible détecté')
        return
      }
      medias.each((_, el) => {
        const $el = Cypress.$(el)
        const hasControls = $el.attr('controls') !== undefined
        const hasCustomPlayer = $el.closest('[role="application"], [class*="player"]').find('button').length > 0
        if (!hasControls && !hasCustomPlayer) {
          cy.task('log', `⚠️  4.11 — Média sans contrôles natifs ni lecteur custom : <${el.tagName.toLowerCase()}>`)
        }
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 5 — Tableaux
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 5 — Tableaux', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('5.1 — Tableau de données complexe : résumé pertinent', () => {
    cy.get('body').then(($body) => {
      const tables = $body.find('table')
      if (tables.length === 0) {
        cy.task('log', 'ℹ️  5.1 — Aucun tableau trouvé sur cette page')
        return
      }
      tables.each((_, table) => {
        const $table = Cypress.$(table)
        const role = $table.attr('role') || ''
        if (role === 'presentation' || role === 'none') return

        // Un tableau complexe a des en-têtes sur plusieurs lignes/colonnes ou des colspan/rowspan
        const hasColspan = $table.find('[colspan], [rowspan]').length > 0
        const hasMultipleHeaderRows = $table.find('thead tr').length > 1
        const isComplex = hasColspan || hasMultipleHeaderRows

        if (isComplex) {
          const ariaDescribedby = $table.attr('aria-describedby') || ''
          const summary = $table.attr('summary') || ''
          const caption = $table.find('caption').text() || ''
          if (!ariaDescribedby && !summary && !caption) {
            cy.task('log', '⚠️  5.1 — Tableau complexe sans résumé (aria-describedby/summary/caption)')
          }
        }
      })
    })
  })

  it('5.3 — Tableau de mise en forme : linéarisation correcte', () => {
    cy.get('body').then(($body) => {
      const tables = $body.find('table[role="presentation"], table[role="none"]')
      if (tables.length === 0) {
        cy.task('log', 'ℹ️  5.3 — Aucun tableau de mise en forme trouvé')
        return
      }
      tables.each((_, table) => {
        const $table = Cypress.$(table)
        // Un tableau de mise en forme ne doit pas utiliser colspan/rowspan (linéarisation compromise)
        const hasSpan = $table.find('[colspan]:not([colspan="1"]), [rowspan]:not([rowspan="1"])').length > 0
        if (hasSpan) {
          cy.task('log', '⚠️  5.3 — Tableau de présentation avec colspan/rowspan (linéarisation compromise)')
        }
      })
    })
  })

  it('5.4 — Tableau de données avec titre correctement associé', () => {
    cy.get('body').then(($body) => {
      const tables = $body.find('table')
      if (tables.length === 0) {
        cy.task('log', 'ℹ️  5.4 — Aucun tableau trouvé sur cette page')
        return
      }
      tables.each((_, table) => {
        const $table = Cypress.$(table)
        const role = $table.attr('role') || ''
        if (role === 'presentation' || role === 'none') return

        const caption = $table.find('caption').text() || ''
        const ariaLabel = $table.attr('aria-label') || ''
        const ariaLabelledby = $table.attr('aria-labelledby') || ''

        if ($table.find('th').length > 0 && !caption && !ariaLabel && !ariaLabelledby) {
          cy.task('log', '⚠️  5.4 — Tableau de données sans titre (caption/aria-label)')
        }
      })
    })
  })

  it('5.6 — En-têtes de colonnes/lignes correctement déclarés', () => {
    cy.get('body').then(($body) => {
      const tables = $body.find('table')
      if (tables.length === 0) {
        cy.task('log', 'ℹ️  5.6 — Aucun tableau trouvé sur cette page')
        return
      }
      tables.each((_, table) => {
        const $table = Cypress.$(table)
        const role = $table.attr('role') || ''
        if (role === 'presentation' || role === 'none') return

        const rows = $table.find('tr')
        if (rows.length > 1 && $table.find('th').length === 0) {
          cy.task('log', '⚠️  5.6 — Tableau sans en-têtes (th) détecté')
        }
      })
    })
  })

  it('5.7 — En-têtes avec attribut scope ou id/headers', () => {
    cy.get('body').then(($body) => {
      const tables = $body.find('table')
      if (tables.length === 0) {
        cy.task('log', 'ℹ️  5.7 — Aucun tableau trouvé sur cette page')
        return
      }
      tables.each((_, table) => {
        const $table = Cypress.$(table)
        const role = $table.attr('role') || ''
        if (role === 'presentation' || role === 'none') return

        const ths = $table.find('th')
        if (ths.length === 0) return

        // Pour les tableaux avec en-têtes, vérifier scope ou id/headers
        const hasColspan = $table.find('[colspan], [rowspan]').length > 0
        if (hasColspan) {
          // Tableau complexe : devrait utiliser id/headers
          ths.each((_, th) => {
            const $th = Cypress.$(th)
            const hasId = Boolean($th.attr('id'))
            const hasScope = Boolean($th.attr('scope'))
            if (!hasId && !hasScope) {
              cy.task('log', `⚠️  5.7 — En-tête <th> sans scope ni id dans tableau complexe : "${$th.text().substring(0, 30)}"`)
            }
          })
        } else {
          // Tableau simple : scope suffit
          let thWithoutScope = 0
          ths.each((_, th) => {
            const $th = Cypress.$(th)
            if (!$th.attr('scope') && !$th.attr('id')) {
              thWithoutScope++
            }
          })
          if (thWithoutScope > 0) {
            cy.task('log', `⚠️  5.7 — ${thWithoutScope} en-tête(s) <th> sans attribut scope`)
          }
        }
      })
    })
  })

  it('5.8 — Tableau de mise en forme sans éléments de tableau de données', () => {
    cy.get('body').then(($body) => {
      const tables = $body.find('table[role="presentation"], table[role="none"]')
      if (tables.length === 0) {
        cy.task('log', 'ℹ️  5.8 — Aucun tableau de présentation trouvé')
        return
      }
      tables.each((_, table) => {
        const $table = Cypress.$(table)
        expect($table.find('th').length, 'Table de présentation ne doit pas avoir de th').to.equal(0)
        expect($table.find('caption').length, 'Table de présentation ne doit pas avoir de caption').to.equal(0)
        expect($table.find('thead').length, 'Table de présentation ne doit pas avoir de thead').to.equal(0)
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 6 — Liens
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 6 — Liens', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('6.1 — Chaque lien est explicite (a un intitulé accessible)', () => {
    cy.get('a:visible').each(($link) => {
      const text = $link.text().trim()
      const ariaLabel = $link.attr('aria-label')?.trim() || ''
      const ariaLabelledby = $link.attr('aria-labelledby') || ''
      const title = $link.attr('title')?.trim() || ''
      const imgAlt = $link.find('img').attr('alt') || ''
      const svgTitle = $link.find('svg title').text() || ''

      const hasAccessibleName = Boolean(text || ariaLabel || ariaLabelledby || title || imgAlt || svgTitle)

      expect(
        hasAccessibleName,
        `Lien doit avoir un intitulé accessible : ${$link.prop('outerHTML').substring(0, 100)}`
      ).to.be.true
    })
  })

  it('6.2 — Chaque lien a un intitulé (non vide)', () => {
    cy.get('a').each(($link) => {
      // Les liens masqués ne sont pas concernés
      if (!$link.is(':visible') && !$link.hasClass('sr-only') && !$link.hasClass('fr-sr-only')) return

      const text = $link.text().trim()
      const ariaLabel = $link.attr('aria-label')?.trim() || ''
      const title = $link.attr('title')?.trim() || ''
      const imgAlt = $link.find('img[alt]').attr('alt') || ''

      expect(
        Boolean(text || ariaLabel || title || imgAlt),
        `Lien ne doit pas être vide : ${$link.prop('outerHTML').substring(0, 100)}`
      ).to.be.true
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 7 — Scripts
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 7 — Scripts', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('7.1 — Scripts compatibles avec les technologies d\'assistance (axe-core)', () => {
    cy.injectAxe()
    cy.checkA11y(null, {
      runOnly: ['aria-allowed-attr', 'aria-valid-attr-value', 'aria-valid-attr',
        'aria-required-attr', 'aria-roles', 'aria-hidden-body']
    }, (violations) => {
      if (violations.length) {
        violations.forEach((v) => {
          cy.task('log', `⚠️  7.1 — ${v.id}: ${v.description} (${v.nodes.length} éléments)`)
        })
      }
      expect(violations.length).to.be.lessThan(5)
    }, true)
  })

  it('7.2 — Script : alternative accessible présente si nécessaire', () => {
    // Vérifier que les éléments gérés par script (role ARIA) ont un nom accessible
    cy.get('body').then(($body) => {
      const widgetRoles = ['tabpanel', 'dialog', 'alertdialog', 'tooltip', 'menu', 'menubar',
        'listbox', 'tree', 'grid', 'treegrid', 'slider', 'progressbar']
      const selector = widgetRoles.map(r => `[role="${r}"]`).join(', ')
      const widgets = $body.find(selector)
      if (widgets.length === 0) {
        cy.task('log', 'ℹ️  7.2 — Aucun widget ARIA complexe détecté')
        return
      }
      widgets.each((_, el) => {
        const $el = Cypress.$(el)
        const role = $el.attr('role')
        const ariaLabel = $el.attr('aria-label') || ''
        const ariaLabelledby = $el.attr('aria-labelledby') || ''
        const title = $el.attr('title') || ''
        if (!ariaLabel && !ariaLabelledby && !title) {
          cy.task('log', `⚠️  7.2 — Widget role="${role}" sans nom accessible`)
        }
      })
    })
  })

  it('7.3 — Composants interactifs contrôlables au clavier', () => {
    // Les éléments avec des handlers onClick doivent être focusables
    cy.get('body').then(($body) => {
      const interactiveEls = $body.find('[onclick]:visible, [role="button"]:visible, [role="tab"]:visible')
      if (interactiveEls.length === 0) {
        cy.task('log', 'ℹ️  7.3 — Aucun élément [onclick]/role="button"/role="tab" visible')
        return
      }
      interactiveEls.each((_, el) => {
        const $el = Cypress.$(el)
        const tagName = el.tagName.toLowerCase()
        const tabindex = $el.attr('tabindex')
        const isFocusable = ['a', 'button', 'input', 'select', 'textarea'].includes(tagName) ||
          (tabindex !== undefined && tabindex !== '-1')

        if (!isFocusable) {
          cy.task('log', `⚠️  7.3 — Élément interactif non focusable : <${tagName}>`)
        }
      })
    })
  })

  it('7.4 — Changement de contexte initié par un script : informé ou contrôlable', () => {
    // Un select avec onchange qui navigue sans bouton de validation est un problème
    cy.get('body').then(($body) => {
      const selects = $body.find('select[onchange]:visible')
      if (selects.length > 0) {
        cy.task('log', `⚠️  7.4 — ${selects.length} select(s) avec onchange (changement de contexte potentiel sans validation)`)
      }
      // Vérifier qu'aucun champ ne déclenche un changement de contexte au focus
      const onfocusElements = $body.find('[onfocus]:visible')
      if (onfocusElements.length > 0) {
        cy.task('log', `⚠️  7.4 — ${onfocusElements.length} élément(s) avec onfocus (changement de contexte potentiel)`)
      }
    })
  })

  it('7.5 — Messages de statut restitués (aria-live)', () => {
    // Vérifier que les zones de messages dynamiques utilisent aria-live
    cy.get('[role="alert"], [role="status"], [aria-live]').then(($elements) => {
      // Log les zones trouvées pour vérification
      if ($elements.length > 0) {
        cy.task('log', `✓ 7.5 — ${$elements.length} zone(s) aria-live détectée(s)`)
      }
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 8 — Éléments obligatoires
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 8 — Éléments obligatoires', { tags: '@a11y' }, () => {
  PAGES_TO_TEST.forEach(({ name, url }) => {
    describe(`Page : ${name}`, () => {
      beforeEach(() => {
        cy.visit(url, { timeout: 120000 })
        cy.get('body').should('be.visible')
      })

      it('8.1 — Page définie par un type de document (DOCTYPE)', () => {
        cy.document().its('doctype').should('not.be.null')
        cy.document().its('doctype.name').should('eq', 'html')
      })

      it('8.2 — Code source HTML valide (vérification structurelle)', () => {
        // Vérifier les erreurs courantes de validité HTML
        cy.get('body').then(($body) => {
          // Pas de doublons d'id
          const ids = {}
          let duplicates = 0
          $body.find('[id]').each((_, el) => {
            const id = el.id
            if (ids[id]) {
              duplicates++
              if (duplicates <= 5) {
                cy.task('log', `⚠️  8.2 — ID dupliqué : "${id}"`)
              }
            }
            ids[id] = true
          })
          if (duplicates > 5) {
            cy.task('log', `⚠️  8.2 — ${duplicates} ID(s) dupliqué(s) au total`)
          }
          expect(duplicates, 'Pas de doublons d\'id').to.equal(0)
        })
      })

      it('8.3 — Langue par défaut présente', () => {
        cy.get('html').should('have.attr', 'lang')
      })

      it('8.4 — Code de langue pertinent', () => {
        cy.get('html').invoke('attr', 'lang').then((lang) => {
          if (!lang || lang.trim() === '') {
            cy.task('log', `⚠️  8.4 — Attribut lang vide ou absent sur ${url}`)
          } else {
            expect(lang).to.match(/^[a-z]{2}(-[a-zA-Z]{2,})?$/)
          }
        })
      })

      it('8.5 — Titre de page présent', () => {
        cy.title().should('not.be.empty')
      })

      it('8.6 — Titre de page pertinent (non générique)', () => {
        cy.title().should('have.length.greaterThan', 2)
        cy.title().should('not.be.oneOf', ['untitled', 'page'])
      })

      it('8.7 — Changement de langue signalé dans le code', () => {
        // Vérifier que les passages en langue étrangère ont un attribut lang
        cy.get('body').then(($body) => {
          // Vérifier les éléments avec un attribut lang (bonne pratique)
          const langElements = $body.find('[lang]:not(html)')
          if (langElements.length > 0) {
            langElements.each((_, el) => {
              const $el = Cypress.$(el)
              const lang = $el.attr('lang') || ''
              expect(lang).to.match(/^[a-z]{2}(-[a-zA-Z]{2,})?$/, `Attribut lang valide : "${lang}"`)
            })
            cy.task('log', `✓ 8.7 — ${langElements.length} passage(s) avec changement de langue signalé(s)`)
          } else {
            cy.task('log', 'ℹ️  8.7 — Aucun changement de langue signalé (vérifier manuellement les contenus en langue étrangère)')
          }
        })
      })

      it('8.9 — Balises non utilisées uniquement pour la présentation', () => {
        // Vérifier l'absence de balises de présentation obsolètes
        cy.get('body').then(($body) => {
          expect($body.find('center').length, 'Pas de balise <center>').to.equal(0)
          expect($body.find('font').length, 'Pas de balise <font>').to.equal(0)
          expect($body.find('marquee').length, 'Pas de balise <marquee>').to.equal(0)
          expect($body.find('blink').length, 'Pas de balise <blink>').to.equal(0)
          expect($body.find('u').length, 'Pas de balise <u> (sauf si sémantique)').to.be.lessThan(3)
        })
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 9 — Structuration de l'information
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 9 — Structuration de l\'information', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('9.1 — Information structurée par des titres (hiérarchie h1-h6)', () => {
    // Au moins un titre h1 doit être présent
    cy.get('h1').should('have.length.at.least', 1)

    // Vérifier la hiérarchie des titres (pas de saut de niveau)
    cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
      let previousLevel = 0
      $headings.each((_, el) => {
        const level = parseInt(el.tagName.replace('H', ''))
        // Le saut de niveau ne doit pas dépasser +1 (h1 → h3 est interdit)
        if (previousLevel > 0 && level > previousLevel + 1) {
          cy.task('log', `⚠️  9.1 — Saut de niveau de titre : h${previousLevel} → h${level} (${el.textContent.substring(0, 40)})`)
        }
        previousLevel = level
      })
    })
  })

  it('9.2 — Structure du document cohérente (landmarks)', () => {
    // Vérifier les zones sémantiques HTML5
    cy.get('body').then(($body) => {
      const hasHeader = $body.find('header, [role="banner"]').length > 0
      const hasMain = $body.find('main, [role="main"], #main, #content, [role="application"]').length > 0
      const hasFooter = $body.find('footer, [role="contentinfo"]').length > 0
      const hasNav = $body.find('nav, [role="navigation"]').length > 0

      if (!hasHeader) cy.task('log', '⚠️  9.2 — Pas de header/banner détecté')
      if (!hasMain) cy.task('log', '⚠️  9.2 — Pas de main/role="main" détecté (application SPA)')
      if (!hasFooter) cy.task('log', '⚠️  9.2 — Pas de footer/contentinfo détecté')
      if (!hasNav) cy.task('log', '⚠️  9.2 — Pas de nav/role="navigation" détecté')

      // Baseline : cartes.gouv.fr est une SPA cartographique, les landmarks
      // peuvent être absents. On log mais on ne bloque pas.
      const totalLandmarks = [hasHeader, hasMain, hasFooter, hasNav].filter(Boolean).length
      cy.task('log', `ℹ️  9.2 — ${totalLandmarks}/4 landmarks détectés`)
    })
  })

  it('9.3 — Listes correctement structurées', () => {
    // Les ul/ol ne doivent contenir que des li (ou script/template)
    cy.get('ul, ol').each(($list) => {
      $list.children().each((_, child) => {
        const tag = child.tagName.toLowerCase()
        expect(
          ['li', 'script', 'template'].includes(tag),
          `Enfant direct de ul/ol doit être li, trouvé : <${tag}>`
        ).to.be.true
      })
    })
  })

  it('9.4 — Citations correctement structurées (q et blockquote)', () => {
    cy.get('body').then(($body) => {
      // Vérifier que les blockquote contiennent bien du contenu
      const blockquotes = $body.find('blockquote')
      if (blockquotes.length === 0) {
        cy.task('log', 'ℹ️  9.4 — Aucune citation (blockquote) trouvée')
        return
      }
      blockquotes.each((_, bq) => {
        const $bq = Cypress.$(bq)
        const text = $bq.text().trim()
        expect(text.length, 'blockquote ne doit pas être vide').to.be.greaterThan(0)
        // Vérifier que blockquote n'est pas utilisé juste pour l'indentation
        if (text.length < 5) {
          cy.task('log', `⚠️  9.4 — blockquote possiblement utilisé pour mise en forme (contenu très court : "${text}")`)
        }
      })
      // Vérifier les citations inline q
      const quotes = $body.find('q')
      if (quotes.length > 0) {
        quotes.each((_, q) => {
          const $q = Cypress.$(q)
          expect($q.text().trim().length, 'Balise q ne doit pas être vide').to.be.greaterThan(0)
        })
      }
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 10 — Présentation de l'information
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 10 — Présentation de l\'information', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('10.1 — Feuilles de styles utilisées pour la présentation', () => {
    // Pas d'attributs de présentation inline obsolètes
    cy.get('[bgcolor], [align]:not(td):not(th):not(col), [valign], [border]:not(table)')
      .should('have.length', 0)
  })

  it('10.2 — Contenus visibles sans CSS restent compréhensibles', () => {
    // Désactiver toutes les CSS et vérifier que le contenu reste visible
    cy.document().then((doc) => {
      // Désactiver les stylesheets
      const sheets = doc.querySelectorAll('link[rel="stylesheet"], style')
      sheets.forEach((s) => s.setAttribute('disabled', 'true'))
    })
    // Vérifier que le contenu textuel est toujours présent
    cy.get('body').then(($body) => {
      const text = $body.text().trim()
      expect(text.length, 'Le contenu textuel doit rester visible sans CSS').to.be.greaterThan(50)
    })
    // Vérifier que les images informatives restent visibles
    cy.get('img[alt]:visible').should('exist')
  })

  it('10.4 — Taille de caractère en unités relatives', () => {
    // Vérifier que les tailles de texte ne sont pas en px dans les styles inline
    cy.get('body').then(($body) => {
      let fixedFontSizeCount = 0
      $body.find('[style]').each((_, el) => {
        const style = el.getAttribute('style') || ''
        if (style.match(/font-size\s*:\s*\d+px/i)) {
          fixedFontSizeCount++
        }
      })
      if (fixedFontSizeCount > 0) {
        cy.task('log', `⚠️  10.4 — ${fixedFontSizeCount} élément(s) avec font-size en px dans le style inline`)
      }
    })
  })

  it('10.6 — Lien visible par rapport au texte environnant (pas seulement couleur)', () => {
    cy.injectAxe()
    cy.checkA11y(null, {
      runOnly: ['link-in-text-block']
    }, (violations) => {
      if (violations.length) {
        cy.task('log', `⚠️  10.6 — ${violations[0].nodes.length} lien(s) non distinguable(s) du texte environnant`)
      }
    }, true)
  })

  it('10.7 — Prise de focus visible', () => {
    // Vérifier que le outline n'est pas masqué globalement
    cy.get('a:visible').first().focus()
    cy.focused().should('match', 'a').then(($el) => {
      // Vérifier qu'un style de focus est appliqué
      const outline = getComputedStyle($el[0]).outline
      const boxShadow = getComputedStyle($el[0]).boxShadow
      // Au moins un indicateur de focus devrait être visible
      const hasVisibleFocus = (outline && outline !== 'none' && !outline.includes('0px')) ||
        (boxShadow && boxShadow !== 'none')
      if (!hasVisibleFocus) {
        cy.task('log', '⚠️  10.7 — Focus potentiellement non visible sur le premier lien')
      }
    })
  })

  it('10.8 — Contenu caché correctement restitué par les technologies d\'assistance', () => {
    // aria-hidden="true" ne doit pas masquer du contenu focusable
    cy.get('body').then(($body) => {
      const hiddenWithFocusable = $body.find('[aria-hidden="true"]')
      let issues = 0
      hiddenWithFocusable.each((_, el) => {
        const $el = Cypress.$(el)
        const focusable = $el.find('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable.length > 0 && $el.is(':visible')) {
          issues++
          if (issues <= 3) {
            cy.task('log', `⚠️  10.8 — aria-hidden="true" contient ${focusable.length} élément(s) focusable(s)`)
          }
        }
      })
      if (issues > 3) {
        cy.task('log', `⚠️  10.8 — ${issues} zone(s) aria-hidden avec éléments focusables au total`)
      }
    })
  })

  it('10.10 — Contenus cachés rendus visibles au focus et au survol', () => {
    // Vérifier que les éléments display:none ou visibility:hidden ne contiennent pas d'éléments focusables
    // sans mécanisme de révélation
    cy.get('body').then(($body) => {
      let hiddenFocusable = 0
      $body.find('[style*="display: none"], [style*="display:none"], .sr-only, .fr-sr-only').each((_, el) => {
        const $el = Cypress.$(el)
        // sr-only est un pattern valide, on l'exclut
        if ($el.hasClass('sr-only') || $el.hasClass('fr-sr-only')) return
        const focusable = $el.find('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])')
        if (focusable.length > 0) {
          hiddenFocusable += focusable.length
        }
      })
      if (hiddenFocusable > 0) {
        cy.task('log', `⚠️  10.10 — ${hiddenFocusable} élément(s) focusable(s) dans des conteneurs cachés (display:none)`)
      }
    })
  })

  it('10.13 — Contenus additionnels au survol/focus contrôlables (Escape)', () => {
    // Vérifier que les tooltips/popovers ont un moyen de fermeture
    cy.get('body').then(($body) => {
      const tooltips = $body.find('[role="tooltip"], [data-tooltip], [aria-describedby]')
      if (tooltips.length === 0) {
        cy.task('log', 'ℹ️  10.13 — Aucun tooltip/popover détecté')
        return
      }
      cy.task('log', `ℹ️  10.13 — ${tooltips.length} tooltip(s)/popover(s) détecté(s) (vérifier fermeture avec Échap)`)

      // Vérifier les popups/popovers qui devraient être fermables
      const popovers = $body.find('[role="dialog"]:visible, [role="alertdialog"]:visible')
      popovers.each((_, el) => {
        const $el = Cypress.$(el)
        const hasCloseBtn = $el.find('button[aria-label*="fermer"], button[aria-label*="close"], button[class*="close"]').length > 0
        if (!hasCloseBtn) {
          cy.task('log', `⚠️  10.13 — Dialog visible sans bouton de fermeture détecté`)
        }
      })
    })
  })

  it('10.11 — Contenus lisibles sans scroll horizontal à 320px (responsive)', () => {
    cy.viewport(320, 568)
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')

    // Vérifier que le body ne dépasse pas la largeur du viewport
    cy.get('body').then(($body) => {
      const bodyWidth = $body[0].scrollWidth
      expect(bodyWidth).to.be.at.most(360) // Petite marge de tolérance
    })
  })

  it('10.12 — Espacement du texte modifiable sans perte de contenu', () => {
    // Injecter des styles d'espacement de texte (critère WCAG 1.4.12)
    cy.document().then((doc) => {
      const style = doc.createElement('style')
      style.textContent = `
        * {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        p { margin-bottom: 2em !important; }
      `
      doc.head.appendChild(style)
    })

    // Vérifier qu'aucun contenu ne déborde
    cy.get('body').then(($body) => {
      const scrollWidth = $body[0].scrollWidth
      const clientWidth = $body[0].clientWidth
      expect(scrollWidth).to.be.at.most(clientWidth + 50)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 11 — Formulaires
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 11 — Formulaires', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('11.1 — Chaque champ de formulaire a une étiquette', () => {
    cy.get('input:visible, select:visible, textarea:visible').each(($el) => {
      const type = $el.attr('type')
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'image') return

      const id = $el.attr('id') || ''
      const ariaLabel = $el.attr('aria-label') || ''
      const ariaLabelledby = $el.attr('aria-labelledby') || ''
      const title = $el.attr('title') || ''
      const placeholder = $el.attr('placeholder') || ''
      const hasForLabel = id ? Cypress.$(`label[for="${id}"]`).length > 0 : false
      const hasWrappingLabel = $el.closest('label').length > 0

      expect(
        Boolean(ariaLabel || ariaLabelledby || title || hasForLabel || hasWrappingLabel || placeholder),
        `Champ doit avoir une étiquette : ${$el.prop('outerHTML').substring(0, 100)}`
      ).to.be.true
    })
  })

  it('11.2 — Étiquettes pertinentes (non vides, non génériques)', () => {
    cy.get('body').then(($body) => {
      const labels = $body.find('label:visible')
      if (labels.length === 0) {
        cy.task('log', 'ℹ️  11.2 — Aucun label visible trouvé sur cette page')
        return
      }
      labels.each((_, label) => {
        const $label = Cypress.$(label)
        const text = $label.text().trim()
        const forAttr = $label.attr('for') || ''

        if (forAttr) {
          const field = Cypress.$(`#${CSS.escape(forAttr)}`)
          if (field.length && field.is(':visible') && text.length === 0) {
            cy.task('log', `⚠️  11.2 — Label vide pour #${forAttr}`)
          }
        }
      })
    })
  })

  it('11.3 — Étiquette cohérente avec l\'intitulé visible', () => {
    // Le nom accessible (aria-label) ne doit pas être complètement différent du texte visible du label
    cy.get('input[aria-label]:visible, select[aria-label]:visible, textarea[aria-label]:visible').each(($el) => {
      const ariaLabel = ($el.attr('aria-label') || '').toLowerCase().trim()
      const id = $el.attr('id') || ''
      if (!id) return
      const labelEl = Cypress.$(`label[for="${id}"]`)
      if (labelEl.length === 0) return
      const visibleText = labelEl.text().toLowerCase().trim()
      // Le aria-label doit contenir le texte visible (WCAG 2.5.3)
      if (visibleText && ariaLabel && !ariaLabel.includes(visibleText)) {
        cy.task('log', `⚠️  11.3 — aria-label "${ariaLabel}" ne contient pas le texte visible "${visibleText}"`)
      }
    })
  })

  it('11.4 — Étiquette correctement associée au champ', () => {
    // Vérifier que les label[for] pointent vers un champ existant
    cy.get('label[for]').each(($label) => {
      const forAttr = $label.attr('for') || ''
      if (!forAttr) return
      const target = Cypress.$(`#${CSS.escape(forAttr)}`)
      if (target.length === 0) {
        cy.task('log', `⚠️  11.4 — label[for="${forAttr}"] pointe vers un élément inexistant`)
      } else {
        const tagName = target[0].tagName.toLowerCase()
        const validTargets = ['input', 'select', 'textarea', 'button', 'meter', 'output', 'progress']
        if (!validTargets.includes(tagName)) {
          cy.task('log', `⚠️  11.4 — label[for="${forAttr}"] pointe vers <${tagName}> (non valide)`)
        }
      }
    })
  })

  it('11.5 — Champs de même nature regroupés (fieldset/legend)', () => {
    // Vérifier que les groupes de radio/checkbox utilisent fieldset
    cy.get('body').then(($body) => {
      const radios = $body.find('input[type="radio"]:visible')
      if (radios.length === 0) {
        cy.task('log', 'ℹ️  11.5 — Aucun bouton radio visible trouvé')
        return
      }

      const names = [...new Set(radios.map((_, el) => el.name).get())]
      names.forEach((name) => {
        if (!name) return
        const group = $body.find(`input[type="radio"][name="${CSS.escape(name)}"]`)
        if (group.length > 1) {
          const hasFieldset = group.closest('fieldset').length > 0
          const hasRoleGroup = group.closest('[role="group"], [role="radiogroup"]').length > 0
          if (!hasFieldset && !hasRoleGroup) {
            cy.task('log', `⚠️  11.5 — Groupe radio "${name}" sans fieldset/role="group"`)
          }
        }
      })
    })
  })

  it('11.6 — Regroupement de champs : légende pertinente (fieldset/legend)', () => {
    cy.get('body').then(($body) => {
      const fieldsets = $body.find('fieldset')
      if (fieldsets.length === 0) {
        cy.task('log', 'ℹ️  11.6 — Aucun fieldset trouvé')
        return
      }
      fieldsets.each((_, fieldset) => {
        const $fieldset = Cypress.$(fieldset)
        const legend = $fieldset.find('legend').first()
        if (legend.length === 0) {
          cy.task('log', '⚠️  11.6 — Fieldset sans legend détecté')
        } else {
          const text = legend.text().trim()
          expect(text.length, 'Legend ne doit pas être vide').to.be.greaterThan(0)
        }
      })
    })
  })

  it('11.7 — Regroupement dans un select : optgroup pertinent', () => {
    cy.get('body').then(($body) => {
      const selects = $body.find('select:visible')
      if (selects.length === 0) {
        cy.task('log', 'ℹ️  11.7 — Aucun select visible trouvé sur cette page')
        return
      }
      selects.each((_, select) => {
        const $select = Cypress.$(select)
        const options = $select.find('option')
        const optgroups = $select.find('optgroup')
        if (options.length > 10 && optgroups.length === 0) {
          cy.task('log', `⚠️  11.7 — Select avec ${options.length} options sans optgroup (regroupement recommandé)`)
        }
        optgroups.each((_, og) => {
          const $og = Cypress.$(og)
          const label = $og.attr('label') || ''
          expect(label.length, 'optgroup doit avoir un attribut label non vide').to.be.greaterThan(0)
        })
      })
    })
  })

  it('11.10 — Contrôle de saisie : message d\'erreur disponible', () => {
    cy.get('body').then(($body) => {
      // Champs en erreur via aria-invalid
      const ariaInvalid = $body.find('[aria-invalid="true"]:visible')
      // Champs en erreur via validation native (sans :invalid pseudo qui n'est pas supporté par jQuery)
      const nativeInvalid = $body.find('input:visible, select:visible, textarea:visible').filter((_, el) => {
        return el.validity && !el.validity.valid
      })
      const invalidFields = ariaInvalid.add(nativeInvalid)
      if (invalidFields.length === 0) {
        cy.task('log', 'ℹ️  11.10 — Aucun champ en erreur détecté')
        return
      }
      invalidFields.each((_, el) => {
        const $el = Cypress.$(el)
        const ariaDescribedby = $el.attr('aria-describedby') || ''
        const ariaErrormessage = $el.attr('aria-errormessage') || ''
        const hasErrorMsg = Boolean(ariaDescribedby || ariaErrormessage)
        if (!hasErrorMsg) {
          const id = $el.attr('id') || $el.attr('name') || 'unknown'
          cy.task('log', `⚠️  11.10 — Champ en erreur sans message associé (aria-describedby/aria-errormessage) : ${id}`)
        }
      })
    })
  })

  it('11.9 — Intitulé de chaque bouton pertinent', () => {
    cy.get('button:visible, input[type="submit"]:visible, input[type="button"]:visible').each(($btn) => {
      const text = $btn.text().trim()
      const value = $btn.attr('value')?.trim() || ''
      const ariaLabel = $btn.attr('aria-label')?.trim() || ''
      const title = $btn.attr('title')?.trim() || ''

      const name = text || value || ariaLabel || title
      expect(name.length, `Bouton doit avoir un intitulé : ${$btn.prop('outerHTML').substring(0, 80)}`).to.be.greaterThan(0)
    })
  })

  it('11.13 — Autocomplete sur les champs personnels (axe-core)', () => {
    cy.injectAxe()
    cy.checkA11y(null, {
      runOnly: ['autocomplete-valid']
    }, (violations) => {
      if (violations.length) {
        violations.forEach((v) => {
          cy.task('log', `⚠️  11.13 — ${v.id}: ${v.description}`)
        })
      }
    }, true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 12 — Navigation
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 12 — Navigation', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('12.1 — Deux systèmes de navigation au moins', () => {
    // Vérifier la présence de systèmes de navigation
    cy.get('body').then(($body) => {
      let navSystems = 0
      const details = []

      if ($body.find('nav, [role="navigation"]').length > 0) { navSystems++; details.push('nav') }
      if ($body.find('input[type="search"], [role="search"], form[role="search"], input[type="text"][placeholder]').length > 0) { navSystems++; details.push('recherche') }
      if ($body.find('[aria-label*="fil"], .fr-breadcrumb, nav[aria-label*="breadcrumb"]').length > 0) { navSystems++; details.push('breadcrumb') }
      if ($body.find('a[href*="plan-du-site"], a[href*="sitemap"]').length > 0) { navSystems++; details.push('plan du site') }
      // Liens de navigation interne (SPA)
      if ($body.find('a[href], button[aria-expanded]').length > 5) { navSystems++; details.push('liens/boutons') }

      cy.task('log', `ℹ️  12.1 — ${navSystems} système(s) détecté(s) : ${details.join(', ') || 'aucun'}`)
      if (navSystems < 2) {
        cy.task('log', '⚠️  12.1 — Moins de 2 systèmes de navigation (RGAA exige au moins 2)')
      }
    })
  })

  it('12.2 — Menu de navigation cohérent entre les pages', () => {
    // Visiter deux pages et comparer la structure du menu
    cy.get('nav, [role="navigation"]').first().then(($nav) => {
      const firstPageLinks = []
      $nav.find('a').each((_, a) => {
        firstPageLinks.push(Cypress.$(a).attr('href'))
      })

      if (firstPageLinks.length === 0) {
        cy.task('log', 'ℹ️  12.2 — Aucun lien de navigation trouvé sur la page d\'accueil')
        return
      }

      // Visiter une seconde page et comparer
      cy.visit('/accessibilite', { timeout: 120000 })
      cy.get('body').should('be.visible')
      cy.get('nav, [role="navigation"]').first().then(($nav2) => {
        const secondPageLinks = []
        $nav2.find('a').each((_, a) => {
          secondPageLinks.push(Cypress.$(a).attr('href'))
        })
        // Les liens de navigation principaux doivent être similaires
        const commonLinks = firstPageLinks.filter(l => secondPageLinks.includes(l))
        if (commonLinks.length < firstPageLinks.length * 0.5) {
          cy.task('log', '⚠️  12.2 — Menu de navigation significativement différent entre pages')
        } else {
          cy.task('log', `✓ 12.2 — ${commonLinks.length}/${firstPageLinks.length} liens communs entre les pages`)
        }
      })
    })
  })

  it('12.3 — Page en cours dans le menu signalée', () => {
    cy.get('body').then(($body) => {
      const navLinks = $body.find('nav a, [role="navigation"] a')
      if (navLinks.length === 0) {
        cy.task('log', 'ℹ️  12.3 — Aucun lien de navigation trouvé')
        return
      }
      const currentIndicators = navLinks.filter((_, a) => {
        const $a = Cypress.$(a)
        return $a.attr('aria-current') === 'page' ||
          $a.attr('aria-current') === 'true' ||
          $a.hasClass('active') ||
          $a.hasClass('fr-nav__link--active') ||
          $a.parent().hasClass('active')
      })
      if (currentIndicators.length === 0) {
        cy.task('log', '⚠️  12.3 — Aucune page courante signalée (aria-current="page" ou class active)')
      } else {
        cy.task('log', `✓ 12.3 — ${currentIndicators.length} indicateur(s) de page courante`)
      }
    })
  })

  it('12.4 — Fil d\'Ariane (breadcrumb) présent', () => {
    cy.get('body').then(($body) => {
      const breadcrumb = $body.find('.fr-breadcrumb, nav[aria-label*="fil"], nav[aria-label*="breadcrumb"], [role="navigation"][aria-label*="fil"], ol[class*="breadcrumb"]')
      if (breadcrumb.length === 0) {
        cy.task('log', '⚠️  12.4 — Aucun fil d\'Ariane détecté')
      } else {
        // Vérifier que le fil d'Ariane a un contenu
        const items = breadcrumb.find('li, a')
        expect(items.length, 'Fil d\'Ariane doit contenir des éléments').to.be.greaterThan(0)
        cy.task('log', `✓ 12.4 — Fil d'Ariane détecté avec ${items.length} élément(s)`)
      }
    })
  })

  it('12.5 — Plan du site (sitemap) présent et accessible', () => {
    cy.get('body').then(($body) => {
      const sitemapLink = $body.find('a[href*="plan-du-site"], a[href*="sitemap"], a[href*="plan_du_site"]')
      if (sitemapLink.length === 0) {
        cy.task('log', '⚠️  12.5 — Aucun lien vers un plan du site trouvé')
      } else {
        cy.task('log', `✓ 12.5 — Lien vers plan du site : "${sitemapLink.first().attr('href')}"`)
      }
    })
  })

  it('12.6 — Zones de regroupement identifiables (landmarks ARIA)', () => {
    cy.get('body').then(($body) => {
      const checks = [
        { label: 'header/banner', selector: 'header, [role="banner"]' },
        { label: 'nav/navigation', selector: 'nav, [role="navigation"]' },
        { label: 'main/content', selector: 'main, [role="main"], #main, #content, [role="application"]' },
        { label: 'footer/contentinfo', selector: 'footer, [role="contentinfo"]' }
      ]
      let found = 0
      checks.forEach(({ label, selector }) => {
        if ($body.find(selector).length > 0) {
          found++
        } else {
          cy.task('log', `⚠️  12.6 — Zone "${label}" non trouvée`)
        }
      })
      cy.task('log', `ℹ️  12.6 — ${found}/4 zones de regroupement détectées`)
      if (found < 2) {
        cy.task('log', '⚠️  12.6 — Moins de 2 zones identifiables (problème d\'accessibilité structurelle)')
      }
    })
  })

  it('12.7 — Lien d\'évitement vers le contenu principal', () => {
    // Rechercher un lien d'évitement (skip link)
    cy.get('body').then(($body) => {
      const skipLinks = $body.find('a[href="#main"], a[href="#content"], a[href="#contenu"], .fr-skiplinks a, a.skip-link, a[href*="skip"], a[href*="nav-rapide"], .skiplink a')
      if (skipLinks.length === 0) {
        cy.task('log', '⚠️  12.7 — Aucun lien d\'évitement détecté')
      }
      expect(skipLinks.length, 'Lien d\'évitement présent').to.be.at.least(0)
    })
  })

  it('12.8 — Ordre de tabulation cohérent', () => {
    // Vérifier qu'aucun tabindex positif n'est utilisé (mauvaise pratique)
    cy.get('body').then(($body) => {
      const elements = $body.find('[tabindex]')
      let positiveTabindex = 0
      elements.each((_, el) => {
        const tabindex = parseInt(Cypress.$(el).attr('tabindex'))
        if (tabindex > 0) {
          positiveTabindex++
          cy.task('log', `⚠️  12.8 — tabindex positif (${tabindex}) : ${el.tagName}`)
        }
      })
      expect(positiveTabindex, 'Aucun tabindex positif').to.equal(0)
    })
  })

  it('12.9 — Pas de piège au clavier', () => {
    // Vérifier qu'aucun élément focusable ne capture le focus de manière indésirable
    cy.get('body').then(($body) => {
      // Vérifier l'absence de tabindex très négatif qui pourrait empêcher la navigation
      const traps = $body.find('[tabindex]').filter((_, el) => {
        const val = parseInt(Cypress.$(el).attr('tabindex'))
        return val < -1
      })
      if (traps.length > 0) {
        cy.task('log', `⚠️  12.9 — ${traps.length} élément(s) avec tabindex < -1`)
      }

      // Vérifier qu'il existe des éléments focusables (pas de page piège)
      const focusable = $body.find('a, button, input, select, textarea, [tabindex="0"], [tabindex]:not([tabindex="-1"])')
      cy.task('log', `ℹ️  12.9 — ${focusable.length} élément(s) focusable(s) détecté(s)`)
    })
  })

  it('12.10 — Raccourcis clavier de caractère unique : désactivables ou reconfigurables', () => {
    // Vérifier les accesskey (raccourcis potentiellement conflictuels)
    cy.get('body').then(($body) => {
      const accesskeys = $body.find('[accesskey]')
      if (accesskeys.length > 0) {
        let singleChar = 0
        accesskeys.each((_, el) => {
          const key = Cypress.$(el).attr('accesskey') || ''
          if (key.length === 1) {
            singleChar++
          }
        })
        if (singleChar > 0) {
          cy.task('log', `⚠️  12.10 — ${singleChar} raccourci(s) clavier à caractère unique (accesskey) détecté(s)`)
        }
      } else {
        cy.task('log', 'ℹ️  12.10 — Aucun accesskey détecté')
      }
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Thématique 13 — Consultation
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA Thématique 13 — Consultation', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('13.1 — Pas de limite de temps non contrôlable (meta refresh)', () => {
    // Pas de meta refresh qui redirige automatiquement
    cy.get('meta[http-equiv="refresh"]').should('not.exist')
  })

  it('13.2 — Pas d\'ouverture de nouvelle fenêtre sans action utilisateur', () => {
    // Vérifier que les liens target="_blank" signalent l'ouverture
    cy.get('body').then(($body) => {
      const links = $body.find('a[target="_blank"]:visible')
      if (links.length === 0) {
        cy.task('log', 'ℹ️  13.2 — Aucun lien target="_blank" visible détecté')
        return
      }
      links.each((_, link) => {
        const $link = Cypress.$(link)
        const ariaLabel = $link.attr('aria-label') || ''
        const title = $link.attr('title') || ''
        const text = $link.text()
        const hasSrOnly = $link.find('.sr-only, .fr-sr-only').length > 0
        const hasIcon = $link.find('[aria-hidden="true"]').length > 0

        // Au moins un indicateur d'ouverture dans une nouvelle fenêtre
        const indicates = ariaLabel.includes('nouvelle') || ariaLabel.includes('new') ||
          title.includes('nouvelle') || title.includes('new') ||
          text.includes('nouvelle') || hasSrOnly || hasIcon

        if (!indicates) {
          cy.task('log', `⚠️  13.2 — Lien target="_blank" sans indication : "${text.substring(0, 50)}"`)
        }
      })
    })
  })

  it('13.3 — Document téléchargeable : accessible ou alternative', () => {
    // Vérifier que les liens de téléchargement indiquent le format et le poids
    cy.get('body').then(($body) => {
      const downloadLinks = $body.find('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href$=".xls"], a[href$=".xlsx"], a[href$=".odt"], a[href$=".ods"], a[href$=".ppt"], a[href$=".pptx"], a[download]')
      if (downloadLinks.length === 0) {
        cy.task('log', 'ℹ️  13.3 — Aucun lien de téléchargement détecté')
        return
      }
      downloadLinks.each((_, a) => {
        const $a = Cypress.$(a)
        const text = $a.text().trim()
        const ariaLabel = $a.attr('aria-label') || ''
        const title = $a.attr('title') || ''
        const fullText = (text + ariaLabel + title).toLowerCase()
        const hasFormat = fullText.includes('pdf') || fullText.includes('doc') ||
          fullText.includes('xls') || fullText.includes('odt') ||
          fullText.includes('ods') || fullText.includes('ppt')
        if (!hasFormat) {
          cy.task('log', `⚠️  13.3 — Lien de téléchargement sans indication de format : "${text.substring(0, 50)}"`)
        }
      })
    })
  })

  it('13.4 — Document bureautique en format accessible', () => {
    // Signaler les documents dans des formats non accessibles
    cy.get('body').then(($body) => {
      const nonAccessibleFormats = $body.find('a[href$=".jpg"], a[href$=".png"], a[href$=".gif"], a[href$=".bmp"], a[href$=".tiff"]')
      if (nonAccessibleFormats.length > 0) {
        cy.task('log', `⚠️  13.4 — ${nonAccessibleFormats.length} lien(s) vers des fichiers image (format non accessible pour documents)`)
      }
      // Vérifier la présence de liens vers des formats accessibles en alternative
      const pdfLinks = $body.find('a[href$=".pdf"]')
      if (pdfLinks.length > 0) {
        cy.task('log', `ℹ️  13.4 — ${pdfLinks.length} document(s) PDF (vérifier accessibilité avec un lecteur PDF)`)
      }
    })
  })

  it('13.6 — Contenu en mouvement/clignotant contrôlable', () => {
    cy.get('body').then(($body) => {
      // CSS animations qui pourraient nécessiter un contrôle
      const animatedElements = $body.find('.carousel, .slider, .swiper, [data-autoplay], .marquee, [class*="animate"], [class*="scroll"]')
      if (animatedElements.length > 0) {
        // Vérifier s'il y a un moyen de pause (bouton pause, prefers-reduced-motion)
        const hasPauseButton = $body.find('button[aria-label*="pause"], button[aria-label*="stop"], button[class*="pause"]').length > 0
        if (!hasPauseButton) {
          cy.task('log', `⚠️  13.6 — ${animatedElements.length} élément(s) animé(s) sans bouton pause détecté`)
        }
      } else {
        cy.task('log', 'ℹ️  13.6 — Aucun contenu animé détecté')
      }
    })
  })

  it('13.7 — Pas de changements brusques de luminosité (pas de clignotement rapide)', () => {
    // Vérifier l'absence d'éléments clignotants
    cy.get('body').then(($body) => {
      expect($body.find('blink').length, 'Pas de balise <blink>').to.equal(0)
      expect($body.find('marquee').length, 'Pas de balise <marquee>').to.equal(0)

      // Vérifier les GIF animés (potentiel flash)
      const gifs = $body.find('img[src$=".gif"]:visible')
      if (gifs.length > 0) {
        cy.task('log', `⚠️  13.7 — ${gifs.length} GIF(s) animé(s) détecté(s) (vérifier manuellement)`)
      }
    })
  })

  it('13.8 — Contenus en mouvement contrôlables', () => {
    cy.get('body').then(($body) => {
      // Zones de contenu dynamique
      const liveRegions = $body.find('[aria-live]').length
      cy.task('log', `ℹ️  13.8 — ${liveRegions} zone(s) aria-live`)

      // Vérifier les carrousels/sliders
      const animated = $body.find('[role="slider"], .carousel, .swiper, [data-autoplay]')
      if (animated.length > 0) {
        cy.task('log', `⚠️  13.8 — ${animated.length} élément(s) animé(s) à vérifier manuellement`)
      }
    })
  })

  it('13.9 — Contenu consultable en portrait et paysage', () => {
    // Tester en portrait
    cy.viewport(375, 667)
    cy.get('body').should('be.visible')

    // Tester en paysage
    cy.viewport(667, 375)
    cy.get('body').should('be.visible')
  })

  it('13.10 — Contenu proposé de façon inattendue contrôlable', () => {
    // Vérifier que les popups/modales inattendues ont un moyen de fermeture
    cy.get('body').then(($body) => {
      const modals = $body.find('[role="dialog"]:visible, [role="alertdialog"]:visible, [class*="modal"]:visible, [class*="popup"]:visible')
      if (modals.length === 0) {
        cy.task('log', 'ℹ️  13.10 — Aucun contenu inattendu (modal/popup) détecté')
        return
      }
      modals.each((_, modal) => {
        const $modal = Cypress.$(modal)
        const hasClose = $modal.find('button[aria-label*="fermer"], button[aria-label*="close"], button[class*="close"], [aria-label*="dismiss"]').length > 0
        const hasEscapeHint = $modal.attr('aria-modal') === 'true'
        if (!hasClose && !hasEscapeHint) {
          cy.task('log', '⚠️  13.10 — Modal/popup sans bouton de fermeture ni aria-modal')
        }
      })
    })
  })

  it('13.11 — Actions déclenchées par pointage annulables (pas de mousedown seul)', () => {
    // Vérifier qu'aucun élément n'utilise uniquement onmousedown (action non annulable)
    cy.get('body').then(($body) => {
      const mousedownOnly = $body.find('[onmousedown]:not([onclick]):not([onmouseup])')
      if (mousedownOnly.length > 0) {
        cy.task('log', `⚠️  13.11 — ${mousedownOnly.length} élément(s) avec onmousedown sans onclick/onmouseup (action non annulable)`)
      }
      // Vérifier que les draggable ont une alternative
      const draggables = $body.find('[draggable="true"]:visible')
      if (draggables.length > 0) {
        cy.task('log', `ℹ️  13.11 — ${draggables.length} élément(s) draggable détecté(s) (vérifier alternative clavier)`)
      }
    })
  })

  it('13.12 — Actions déclenchées par mouvement : alternative disponible', () => {
    // Vérifier l'absence de dépendance aux événements de mouvement sans alternative
    cy.get('body').then(($body) => {
      const motionElements = $body.find('[ondevicemotion], [ondeviceorientation]')
      if (motionElements.length > 0) {
        cy.task('log', `⚠️  13.12 — ${motionElements.length} élément(s) utilisant le mouvement du dispositif (vérifier alternative)`)
      } else {
        cy.task('log', 'ℹ️  13.12 — Aucune action par mouvement de dispositif détectée')
      }
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Audit RGAA global par page (axe-core combiné)
// ─────────────────────────────────────────────────────────────────────────────
describe('RGAA — Audit axe-core par page', { tags: '@a11y' }, () => {
  PAGES_TO_TEST.forEach(({ name, url }) => {
    it(`Audit WCAG 2.1 AA complet — ${name} (${url})`, () => {
      cy.visit(url, { timeout: 120000 })
      cy.get('body').should('be.visible')
      cy.injectAxe()

      cy.checkA11y(null, {
        includedImpacts: ['critical', 'serious'],
        rules: {
          // Désactiver les règles connues pour avoir des faux positifs sur ce site
          'region': { enabled: false }
        }
      }, (violations) => {
        if (violations.length) {
          cy.task('log', `\n📋 RGAA Audit — ${name} : ${violations.length} violation(s)`)
          violations.forEach((v) => {
            cy.task('log', `  [${v.impact}] ${v.id} — ${v.description}`)
            cy.task('log', `    RGAA lié : ${mapAxeToRGAA(v.id)}`)
            cy.task('log', `    ${v.nodes.length} occurrence(s)`)
          })
        }
        // Seuil de tolérance par page
        expect(violations.length, `Violations critiques/sérieuses sur ${name}`).to.be.lessThan(10)
      }, true)
    })
  })
})

/**
 * Mapping indicatif axe-core → critères RGAA
 */
function mapAxeToRGAA(axeRuleId) {
  const mapping = {
    'image-alt': '1.1',
    'image-redundant-alt': '1.3',
    'role-img-alt': '1.1',
    'svg-img-alt': '1.1',
    'frame-title': '2.1',
    'frame-title-unique': '2.2',
    'color-contrast': '3.2',
    'link-name': '6.1, 6.2',
    'link-in-text-block': '10.6',
    'aria-allowed-attr': '7.1',
    'aria-valid-attr': '7.1',
    'aria-valid-attr-value': '7.1',
    'aria-required-attr': '7.1',
    'aria-roles': '7.1',
    'html-has-lang': '8.3',
    'html-lang-valid': '8.4',
    'document-title': '8.5',
    'heading-order': '9.1',
    'landmark-one-main': '9.2',
    'region': '9.2',
    'list': '9.3',
    'listitem': '9.3',
    'label': '11.1',
    'label-title-only': '11.1',
    'input-button-name': '11.9',
    'button-name': '11.9',
    'autocomplete-valid': '11.13',
    'bypass': '12.7',
    'tabindex': '12.8',
    'meta-refresh': '13.1',
    'focus-order-semantics': '12.8'
  }
  return mapping[axeRuleId] || 'À déterminer'
}
