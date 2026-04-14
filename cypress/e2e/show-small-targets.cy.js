/**
 * Identifie et surligne les éléments interactifs trop petits (< 24×24px)
 * puis prend un screenshot pour visualisation.
 */
describe('Cibles tactiles trop petites', () => {
  it('identifie et capture les éléments < 24×24px', () => {
    cy.visit('/', { timeout: 120000 })
    cy.get('body', { timeout: 15000 }).should('be.visible')

    // Attendre le rendu complet du SPA
    cy.wait(4000)

    cy.window().then((win) => {
      const doc = win.document
      const results = []

      doc.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"], [tabindex]').forEach((el) => {
        const rect = el.getBoundingClientRect()
        // Ignorer les éléments non visibles
        if (rect.width === 0 || rect.height === 0) return
        const style = win.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return

        if (rect.width < 24 || rect.height < 24) {
          results.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().substring(0, 50),
            ariaLabel: el.getAttribute('aria-label') || '',
            title: el.getAttribute('title') || '',
            href: el.getAttribute('href') || '',
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left)
          })

          // Surligner en rouge les éléments trop petits
          el.style.outline = '3px solid #e1000f'
          el.style.outlineOffset = '2px'
          el.style.boxShadow = '0 0 8px rgba(225,0,15,0.5)'

          // Ajouter un label avec la taille
          const label = doc.createElement('div')
          label.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`
          label.style.cssText = `
            position: fixed;
            top: ${rect.top - 18}px;
            left: ${rect.left}px;
            background: #e1000f;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 2px;
            z-index: 999999;
            pointer-events: none;
            font-family: monospace;
          `
          doc.body.appendChild(label)
        }
      })

      // Logger les résultats
      cy.task('log', `\n${'='.repeat(60)}`)
      cy.task('log', `  ${results.length} CIBLES TROP PETITES (< 24×24px)`)
      cy.task('log', `${'='.repeat(60)}`)
      results.forEach((r, i) => {
        const name = r.ariaLabel || r.title || r.text || r.href || '(sans nom)'
        cy.task('log', `  ${i + 1}. <${r.tag}> ${r.width}×${r.height}px — "${name.substring(0, 60)}"`)
      })
      cy.task('log', '='.repeat(60) + '\n')
    })

    // Prendre un screenshot de la page avec les éléments surlignés
    cy.screenshot('cibles-trop-petites-overview', { capture: 'fullPage' })

    // Scroll jusqu'au footer pour capturer les éléments en bas
    cy.get('footer, [role="contentinfo"]').scrollIntoView({ duration: 0 })
    cy.wait(500)
    cy.screenshot('cibles-trop-petites-footer', { capture: 'viewport' })

    // Revenir en haut
    cy.scrollTo('top')
    cy.wait(500)
    cy.screenshot('cibles-trop-petites-header', { capture: 'viewport' })
  })
})
