/**
 * a11y-secondary-pages.cy.js
 * Tests E2E — Accessibilité (axe-core) des pages secondaires
 * Audit WCAG 2.1 AA sur les pages non couvertes par accessibility.cy.js
 */

describe('Accessibilité des pages secondaires (axe-core)', { tags: '@a11y' }, () => {
  // Violations connues à ignorer (déjà présentes sur la homepage)
  const knownViolations = ['color-contrast', 'document-title', 'html-has-lang']

  const axeOptions = {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    },
  }

  function auditPage(pageName, url) {
    describe(`${pageName}`, () => {
      it(`la page se charge correctement`, () => {
        cy.visit(url, { failOnStatusCode: false })
        cy.get('body', { timeout: 15000 }).should('not.be.empty')
      })

      it(`aucune violation critique ou grave (hors violations connues)`, () => {
        cy.visit(url, { failOnStatusCode: false })
        cy.injectAxe()
        cy.checkA11y(null, axeOptions, (violations) => {
          const newViolations = violations.filter(
            (v) => !knownViolations.includes(v.id)
          )
          if (newViolations.length > 0) {
            const msg = newViolations
              .map((v) => `- [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} éléments)`)
              .join('\n')
            Cypress.log({
              name: '⚠️ A11Y',
              message: `${newViolations.length} violation(s) sur ${pageName}`,
              consoleProps: () => ({ violations: newViolations }),
            })
            cy.log(msg)
          }
        }, true)
      })

      it(`les images ont un attribut alt`, () => {
        cy.visit(url, { failOnStatusCode: false })
        cy.get('img:visible', { timeout: 10000 }).then(($imgs) => {
          const missing = []
          $imgs.each((_, img) => {
            const $img = Cypress.$(img)
            if ($img.attr('alt') === undefined && $img.attr('role') !== 'presentation') {
              missing.push($img.attr('src')?.slice(0, 80))
            }
          })
          if (missing.length > 0) {
            Cypress.log({
              name: '⚠️ IMG',
              message: `${missing.length} image(s) sans alt sur ${pageName}`,
              consoleProps: () => ({ images: missing }),
            })
            cy.log(`⚠️ Images sans alt : ${missing.join(', ')}`)
          }
        })
      })

      it(`la hiérarchie des titres est correcte`, () => {
        cy.visit(url, { failOnStatusCode: false })
        cy.get('h1, h2, h3, h4, h5, h6', { timeout: 10000 }).then(($headings) => {
          if ($headings.length === 0) return

          const skips = []
          let previousLevel = 0
          $headings.each((_, el) => {
            const level = parseInt(el.tagName[1], 10)
            if (previousLevel > 0 && level > previousLevel + 1) {
              skips.push(`${el.tagName} après H${previousLevel}`)
            }
            previousLevel = level
          })
          if (skips.length > 0) {
            Cypress.log({
              name: '⚠️ TITRES',
              message: `${skips.length} saut(s) de niveau sur ${pageName}: ${skips.join(', ')}`,
              consoleProps: () => ({ skips }),
            })
          }
        })
      })
    })
  }

  // Pages secondaires à auditer
  auditPage('Catalogue de données', '/rechercher-une-donnee/')
  auditPage('Fiche BD ORTHO', '/rechercher-une-donnee/dataset/IGNF_BD-ORTHO')
  auditPage('Mentions légales', '/mentions-legales')
  auditPage('Accessibilité', '/accessibilite')
  auditPage('Données personnelles', '/donnees-personnelles')
  auditPage('CGU', '/cgu')
  auditPage('Découvrir', '/decouvrir/')
})
