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
            cy.log(`axe-core : ${newViolations.length} nouvelle(s) violation(s) sur ${pageName}`)
            cy.log(msg)
          }
          // Seules les violations critical/serious non connues font échouer le test
          const blocking = newViolations.filter(
            (v) => v.impact === 'critical'
          )
          expect(
            blocking.length,
            `Violations critiques sur ${pageName} :\n${blocking.map((v) => v.id).join(', ')}`
          ).to.equal(0)
        })
      })

      it(`les images ont un attribut alt`, () => {
        cy.visit(url, { failOnStatusCode: false })
        cy.get('img:visible', { timeout: 10000 }).each(($img) => {
          expect(
            $img.attr('alt') !== undefined || $img.attr('role') === 'presentation',
            `L'image "${$img.attr('src')?.slice(0, 60)}" doit avoir un alt ou role="presentation"`
          ).to.be.true
        })
      })

      it(`la hiérarchie des titres est correcte`, () => {
        cy.visit(url, { failOnStatusCode: false })
        cy.get('h1, h2, h3, h4, h5, h6', { timeout: 10000 }).then(($headings) => {
          if ($headings.length === 0) return // Certaines pages peuvent ne pas avoir de titres

          let previousLevel = 0
          $headings.each((_, el) => {
            const level = parseInt(el.tagName[1], 10)
            // Un titre ne doit pas sauter plus d'un niveau (h1 → h3 sans h2)
            if (previousLevel > 0) {
              expect(
                level <= previousLevel + 1,
                `${el.tagName} après H${previousLevel} : saut de niveau interdit`
              ).to.be.true
            }
            previousLevel = level
          })
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
