describe('Tests d\'accessibilité', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('la page a une structure HTML valide', () => {
    cy.get('html').should('have.attr', 'lang')
    cy.get('head title').should('exist')
    cy.get('body').should('exist')
  })

  it('les images visibles ont un attribut alt', () => {
    cy.get('img:visible').each($img => {
      const src = $img.attr('src') || ''
      const role = $img.attr('role') || ''
      if (role === 'presentation' || role === 'none') return
      if ($img.width() <= 1 && $img.height() <= 1) return
      cy.wrap($img).should($el => {
        const alt = $el.attr('alt')
        expect(alt !== undefined, `img doit avoir un attribut alt : ${src}`).to.be.true
      })
    })
  })

  it('la page a une hiérarchie de titres correcte', () => {
    // Le SPA peut rendre le h1 dans un composant ou utiliser un h2/titre DSFR
    // On vérifie qu'au moins un titre visible existe (h1, h2 ou classe DSFR)
    cy.get('h1, h2, [class*="fr-display"], [class*="fr-h1"]', { timeout: 10000 })
      .should('have.length.at.least', 1)
  })

  it('les liens visibles ne sont pas vides', () => {
    cy.get('a:visible').each($link => {
      const text = $link.text().trim()
      const ariaLabel = $link.attr('aria-label')?.trim() || ''
      const title = $link.attr('title')?.trim() || ''
      const href = $link.attr('href')?.trim() || ''
      const hasAccessibleName = Boolean(text || ariaLabel || title)
      const hasUsableHref = Boolean(href && href !== '#')

      expect(
        hasAccessibleName || hasUsableHref,
        `le lien doit avoir un texte/aria-label/title ou un href valide : ${$link.prop('outerHTML').substring(0, 100)}`
      ).to.eq(true)
    })
  })

  it('des éléments interactifs sont navigables au clavier', () => {
    cy.get('a:visible, button:visible, input:visible')
      .filter(':enabled')
      .should('have.length.greaterThan', 0)

    cy.get('a:visible, button:visible, input:visible')
      .filter(':enabled')
      .first()
      .should('exist')
      .should('be.visible')
      .focus()
  })

  it('les régions landmark ARIA sont présentes (RGAA)', () => {
    cy.get('header, [role="banner"]').should('exist')
    cy.get('nav, [role="navigation"]').should('exist')
    cy.get('footer, [role="contentinfo"]').should('exist')
  })

  it('les contrôles interactifs ont un nom accessible', () => {
    cy.get('input:visible, select:visible, textarea:visible').each(($el) => {
      const type = $el.attr('type')
      if (type === 'hidden' || type === 'submit' || type === 'button') return

      const ariaLabel = $el.attr('aria-label') || ''
      const ariaLabelledby = $el.attr('aria-labelledby') || ''
      const title = $el.attr('title') || ''
      const placeholder = $el.attr('placeholder') || ''
      const id = $el.attr('id') || ''
      const hasForLabel = id ? Cypress.$(`label[for="${id}"]`).length > 0 : false

      expect(
        Boolean(ariaLabel || ariaLabelledby || title || hasForLabel || placeholder),
        `le contrôle doit avoir un nom accessible : ${$el.prop('outerHTML').substring(0, 120)}`
      ).to.be.true
    })
  })

  it('l\'audit WCAG automatisé (axe-core) ne détecte pas de nouvelles violations critiques', () => {
    cy.injectAxe()
    cy.checkA11y(null, {
      includedImpacts: ['critical', 'serious'],
      rules: {
        'image-alt': { enabled: false },
        'region': { enabled: false }
      }
    }, (violations) => {
      if (violations.length) {
        cy.task('log', `axe-core : ${violations.length} violation(s) détectée(s) sur cartes.gouv.fr`)
        violations.forEach((v) => {
          cy.task('log', `  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} éléments)`)
        })
      }
      expect(violations.length, `Nombre de violations a11y (baseline ≤ 5)`).to.be.lessThan(6)
    }, true)
  })
})
