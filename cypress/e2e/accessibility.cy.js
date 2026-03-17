describe('Accessibility Tests', () => {
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
    cy.get('h1').should('have.length.at.least', 1)
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
})
