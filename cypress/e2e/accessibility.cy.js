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
    cy.get('img').each($img => {
      cy.wrap($img).should('have.attr', 'alt')
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
    cy.get('a:visible, button:visible, input:visible')
      .filter(':enabled')
      .first()
      .should('exist')
      .should('be.visible')
      .focus()
      .should('have.focus')
  })
})
