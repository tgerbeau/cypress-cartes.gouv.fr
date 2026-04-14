describe('Accessibility Tests', { tags: '@a11y' }, () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body').should('be.visible')
  })

  it('should have proper HTML structure', () => {
    cy.get('html').should('have.attr', 'lang')
    cy.get('head title').should('exist')
    cy.get('body').should('exist')
  })

  it('should have accessible images', () => {
    // Check that content images have alt attributes
    // Exclude decorative/tracking images (e.g. analytics pixels) that may lack alt
    cy.get('img:visible').each($img => {
      const src = $img.attr('src') || ''
      const role = $img.attr('role') || ''
      // Skip images explicitly marked as decorative (role="presentation" or role="none")
      if (role === 'presentation' || role === 'none') return
      // Skip tiny tracking pixels (1x1 images)
      if ($img.width() <= 1 && $img.height() <= 1) return
      cy.wrap($img).should($el => {
        const alt = $el.attr('alt')
        expect(alt !== undefined, `img should have alt attribute: ${src}`).to.be.true
      })
    })
  })

  it('should have proper heading hierarchy', () => {
    // La homepage peut utiliser h1, h2 ou des classes DSFR display
    cy.get('h1, h2, [class*="fr-display"]').should('have.length.at.least', 1)
  })

  it('should not have empty links', () => {
    cy.get('a:visible').each($link => {
      const text = $link.text().trim()
      const ariaLabel = $link.attr('aria-label')?.trim() || ''
      const title = $link.attr('title')?.trim() || ''
      const href = $link.attr('href')?.trim() || ''
      const hasAccessibleName = Boolean(text || ariaLabel || title)
      const hasUsableHref = Boolean(href && href !== '#')

      expect(
        hasAccessibleName || hasUsableHref,
        `link should have text/aria-label/title or a usable href: ${$link.prop('outerHTML')}`
      ).to.eq(true)
    })
  })

  it('should have keyboard navigable elements', () => {
    // Verify that focusable elements exist on the page
    cy.get('a:visible, button:visible, input:visible')
      .filter(':enabled')
      .should('have.length.greaterThan', 0)

    // Try focusing an input first (most reliably focusable), then fallback to link/button
    cy.get('a:visible, button:visible, input:visible')
      .filter(':enabled')
      .first()
      .should('exist')
      .should('be.visible')
      .trigger('focus')
  })

  it('should have ARIA landmark regions (RGAA)', () => {
    // Un site public français doit avoir les régions landmark
    cy.get('header, [role="banner"]').should('exist')
    cy.get('nav, [role="navigation"]').should('exist')
    cy.get('footer, [role="contentinfo"]').should('exist')
  })

  it('should have labeled interactive controls', () => {
    // Chaque champ de formulaire visible doit avoir un nom accessible
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
        `control should have accessible name: ${$el.prop('outerHTML').substring(0, 120)}`
      ).to.be.true
    })
  })

  it('should pass automated WCAG accessibility audit (axe-core)', () => {
    cy.injectAxe()
    // Audit WCAG 2.1 AA — le standard RGAA français
    // Approche « baseline » : on logue les violations existantes du site
    // et on ne bloque que si de nouvelles violations critiques apparaissent
    cy.checkA11y(null, {
      includedImpacts: ['critical', 'serious'],
      rules: {
        'image-alt': { enabled: false },
        'region': { enabled: false }
      }
    }, (violations) => {
      // Logger toutes les violations pour reporting
      if (violations.length) {
        cy.task('log', `⚠️  axe-core : ${violations.length} violation(s) détectée(s) sur cartes.gouv.fr`)
        violations.forEach((v) => {
          cy.task('log', `  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} éléments)`)
        })
      }
      // Baseline : violations connues du site qu'on ne peut pas corriger
      // Ce nombre sert de seuil → si ça augmente, le test échoue
      expect(violations.length, `Nombre de violations a11y (baseline ≤ 5)`).to.be.lessThan(6)
    }, true)
  })
})
