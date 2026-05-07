#!/usr/bin/env node
/**
 * Génère un rapport RGAA custom à partir du JSON mochawesome + logs Cypress.
 *
 * Usage :
 *   npm run clean:reports
 *   npx cypress run --spec cypress/e2e/rgaa-criteres.cy.js --browser chrome 2>&1 | tee cypress/reports/cypress-output.log
 *   node scripts/generate-rgaa-report.js
 *
 * Ou via le script npm :
 *   npm run test:rgaa-report
 */

const fs = require('fs')
const path = require('path')

// ─── Chemins ────────────────────────────────────────────────────────────────
const REPORTS_DIR = path.resolve(__dirname, '..', 'cypress', 'reports')
const LOG_FILE = path.join(REPORTS_DIR, 'cypress-output.log')
const JSON_GLOB_DIR = path.join(REPORTS_DIR, 'json')
const OUTPUT_FILE = path.join(REPORTS_DIR, 'rgaa-report.html')

// ─── Lecture des données ────────────────────────────────────────────────────
let mochawesomeData = null
const jsonFiles = fs.readdirSync(JSON_GLOB_DIR).filter(f => f.endsWith('.json'))
if (jsonFiles.length === 1) {
  mochawesomeData = JSON.parse(fs.readFileSync(path.join(JSON_GLOB_DIR, jsonFiles[0]), 'utf8'))
} else {
  // Fichier merged
  const merged = path.join(REPORTS_DIR, 'report.json')
  if (fs.existsSync(merged)) {
    mochawesomeData = JSON.parse(fs.readFileSync(merged, 'utf8'))
  } else if (jsonFiles.length > 0) {
    mochawesomeData = JSON.parse(fs.readFileSync(path.join(JSON_GLOB_DIR, jsonFiles[0]), 'utf8'))
  }
}

if (!mochawesomeData) {
  console.error('❌ Aucun fichier JSON mochawesome trouvé dans', JSON_GLOB_DIR)
  process.exit(1)
}

let logContent = ''
if (fs.existsSync(LOG_FILE)) {
  logContent = fs.readFileSync(LOG_FILE, 'utf8')
} else {
  console.warn('⚠️  Fichier de log non trouvé:', LOG_FILE)
  console.warn('   Les warnings ne seront pas inclus dans le rapport.')
}

// ─── Parse des logs ─────────────────────────────────────────────────────────
const warnings = []
const infos = []
const logLines = logContent.split('\n')

for (const line of logLines) {
  const trimmed = line.trim()
  if (trimmed.startsWith('⚠️')) {
    warnings.push(trimmed)
  } else if (trimmed.startsWith('ℹ️')) {
    infos.push(trimmed)
  } else if (trimmed.startsWith('✓') && trimmed.includes('—')) {
    // Ligne de log positif (ex: ✓ 7.5 — ...)
    infos.push(trimmed)
  } else if (trimmed.startsWith('📋')) {
    warnings.push(trimmed)
  }
}

// Regrouper les warnings par critère RGAA
const warningsByCritere = {}
for (const w of warnings) {
  // Extraire le numéro de critère (ex: "⚠️  1.1 — ..." ou "⚠️  3.1/3.2 — ...")
  const match = w.match(/⚠️\s+([\d.]+(?:\/[\d.]+)?)\s*—\s*(.+)/)
  if (match) {
    const critere = match[1]
    const detail = match[2]
    if (!warningsByCritere[critere]) warningsByCritere[critere] = []
    warningsByCritere[critere].push(detail)
  } else if (w.startsWith('📋')) {
    // Audit axe-core
    const auditMatch = w.match(/📋\s+RGAA Audit\s*—\s*(.+?)\s*:\s*(\d+)\s*violation/)
    if (auditMatch) {
      const page = auditMatch[1]
      const count = auditMatch[2]
      if (!warningsByCritere['axe-audit']) warningsByCritere['axe-audit'] = []
      warningsByCritere['axe-audit'].push(`${page} : ${count} violation(s)`)
    }
  }
}

// ─── Parse du JSON mochawesome ──────────────────────────────────────────────
const stats = mochawesomeData.stats
const suites = mochawesomeData.results[0].suites

// Extraire les résultats par thématique
const thematiques = []
for (const suite of suites) {
  const thematique = {
    title: suite.title,
    tests: [],
    subSuites: []
  }

  // Tests directs
  for (const test of (suite.tests || [])) {
    thematique.tests.push({
      title: test.title,
      fullTitle: test.fullTitle,
      pass: test.pass,
      fail: test.fail,
      duration: test.duration
    })
  }

  // Sous-suites (ex: Thématique 8 avec pages)
  for (const sub of (suite.suites || [])) {
    const subSuite = { title: sub.title, tests: [] }
    for (const test of (sub.tests || [])) {
      subSuite.tests.push({
        title: test.title,
        fullTitle: test.fullTitle,
        pass: test.pass,
        fail: test.fail,
        duration: test.duration
      })
    }
    thematique.subSuites.push(subSuite)
  }

  thematiques.push(thematique)
}

// ─── Déterminer les pages testées ───────────────────────────────────────────
const pagesTestedSet = new Set()
// Extraire depuis les sous-suites de la thématique 8
const theme8 = thematiques.find(t => t.title.includes('Thématique 8'))
if (theme8) {
  for (const sub of theme8.subSuites) {
    const pageMatch = sub.title.match(/Page\s*:\s*(.+)/)
    if (pageMatch) pagesTestedSet.add(pageMatch[1].trim())
  }
}
const pagesTested = pagesTestedSet.size || 16

// ─── Classification des warnings par sévérité ──────────────────────────────
const criticalCriteria = ['8.3', '8.4', '9.2', '12.6']
const seriousCriteria = ['1.1', '3.2', '10.7', '12.1', '12.7']

function getSeverity(critere) {
  if (criticalCriteria.includes(critere)) return 'Critique'
  if (seriousCriteria.includes(critere)) return 'Sérieux'
  return 'Modéré'
}

function getSeverityClass(severity) {
  if (severity === 'Critique') return 'status-critical'
  if (severity === 'Sérieux') return 'status-warn'
  return 'status-info'
}

// ─── Extraction des violations axe-core depuis les logs ─────────────────────
const axeViolations = []
let currentAuditPage = null
for (const line of logLines) {
  const trimmed = line.trim()
  const auditHeader = trimmed.match(/📋\s+RGAA Audit\s*—\s*(.+?)\s*:\s*(\d+)\s*violation/)
  if (auditHeader) {
    currentAuditPage = { page: auditHeader[1], count: parseInt(auditHeader[2]), violations: [] }
    axeViolations.push(currentAuditPage)
    continue
  }
  if (currentAuditPage && trimmed.match(/^\[(?:serious|critical)\]/)) {
    const vMatch = trimmed.match(/^\[(serious|critical)\]\s+(\S+)\s*—\s*(.+)/)
    if (vMatch) {
      currentAuditPage.violations.push({ impact: vMatch[1], id: vMatch[2], description: vMatch[3] })
    }
  }
  if (trimmed.startsWith('RGAA lié')) {
    if (currentAuditPage && currentAuditPage.violations.length > 0) {
      const rMatch = trimmed.match(/RGAA lié\s*:\s*(.+)/)
      if (rMatch) {
        currentAuditPage.violations[currentAuditPage.violations.length - 1].rgaa = rMatch[1]
      }
    }
  }
  if (trimmed.match(/^\d+\s+occurrence/)) {
    if (currentAuditPage && currentAuditPage.violations.length > 0) {
      const oMatch = trimmed.match(/^(\d+)\s+occurrence/)
      if (oMatch) {
        currentAuditPage.violations[currentAuditPage.violations.length - 1].occurrences = parseInt(oMatch[1])
      }
    }
  }
  // Reset current page on next test
  if (trimmed.startsWith('✓') && trimmed.includes('Audit WCAG')) {
    currentAuditPage = null
  }
}

// ─── Génération HTML ────────────────────────────────────────────────────────
const now = new Date()
const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const duration = Math.round(stats.duration / 1000)

// Compter les warnings uniques
const uniqueWarnings = Object.keys(warningsByCritere).filter(k => k !== 'axe-audit')
const totalWarnings = uniqueWarnings.reduce((sum, k) => sum + warningsByCritere[k].length, 0)

// Construire les sections par thématique
function buildThematiqueSection(thematique, index) {
  const allTests = [...thematique.tests]
  for (const sub of thematique.subSuites) {
    allTests.push(...sub.tests)
  }
  const passCount = allTests.filter(t => t.pass).length
  const failCount = allTests.filter(t => t.fail).length
  const totalCount = allTests.length

  const hasWarnings = allTests.some(t => {
    const critMatch = t.title.match(/^([\d.]+(?:\/[\d.]+)?)\s*—/)
    return critMatch && warningsByCritere[critMatch[1]]
  })

  const badgeClass = failCount > 0 ? 'badge-fail' : hasWarnings ? 'badge-warn' : 'badge-pass'
  const badgeText = failCount > 0 ? `${failCount} échec(s)` : hasWarnings ? 'Warnings' : `${passCount}/${totalCount}`
  const icon = failCount > 0 ? '❌' : hasWarnings ? '⚠️' : '✅'

  let rows = ''

  // Tests directs
  for (const test of thematique.tests) {
    const critMatch = test.title.match(/^([\d.]+(?:\/[\d.]+)?)\s*—\s*(.+)/)
    const critere = critMatch ? critMatch[1] : ''
    const description = critMatch ? critMatch[2] : test.title
    const testWarnings = critere ? (warningsByCritere[critere] || []) : []

    let statusHtml
    if (test.fail) {
      statusHtml = '<span class="status status-fail">✗ Échec</span>'
    } else if (testWarnings.length > 0) {
      statusHtml = `<span class="status status-warn">⚠️ ${testWarnings.length} warning(s)</span>`
    } else {
      statusHtml = '<span class="status status-pass">✓ Pass</span>'
    }

    let warningDetail = ''
    if (testWarnings.length > 0) {
      const details = [...new Set(testWarnings)].slice(0, 3)
      warningDetail = `<div class="warn-detail">${details.map(d => `• ${escapeHtml(d)}`).join('<br>')}</div>`
      if (testWarnings.length > 3) {
        warningDetail += `<div class="warn-detail" style="color:#999">… et ${testWarnings.length - 3} autre(s)</div>`
      }
    }

    rows += `<tr>
      <td><strong>${critere}</strong></td>
      <td>${escapeHtml(description)}${warningDetail}</td>
      <td>${statusHtml}</td>
    </tr>\n`
  }

  // Sous-suites (pages)
  if (thematique.subSuites.length > 0) {
    // Résumé par critère sur toutes les pages
    const critereMap = {}
    for (const sub of thematique.subSuites) {
      for (const test of sub.tests) {
        const critMatch = test.title.match(/^([\d.]+(?:\/[\d.]+)?)\s*—\s*(.+)/)
        if (critMatch) {
          const c = critMatch[1]
          if (!critereMap[c]) critereMap[c] = { description: critMatch[2], pages: 0, pass: 0, fail: 0, warnings: [] }
          critereMap[c].pages++
          if (test.pass) critereMap[c].pass++
          if (test.fail) critereMap[c].fail++
        }
      }
    }

    // Ajouter les warnings associés
    for (const c of Object.keys(critereMap)) {
      if (warningsByCritere[c]) {
        critereMap[c].warnings = warningsByCritere[c]
      }
    }

    for (const [critere, data] of Object.entries(critereMap)) {
      let statusHtml
      if (data.fail > 0) {
        statusHtml = `<span class="status status-fail">✗ ${data.fail}/${data.pages} échec(s)</span>`
      } else if (data.warnings.length > 0) {
        statusHtml = `<span class="status status-warn">⚠️ ${data.warnings.length} warning(s)</span>`
      } else {
        statusHtml = `<span class="status status-pass">✓ ${data.pass}/${data.pages} pages</span>`
      }

      let warningDetail = ''
      if (data.warnings.length > 0) {
        const uniqueWarns = [...new Set(data.warnings)].slice(0, 3)
        warningDetail = `<div class="warn-detail">${uniqueWarns.map(d => `• ${escapeHtml(d)}`).join('<br>')}</div>`
      }

      rows += `<tr>
        <td><strong>${critere}</strong></td>
        <td>${escapeHtml(data.description)} <em style="color:#888">(${data.pages} pages)</em>${warningDetail}</td>
        <td>${statusHtml}</td>
      </tr>\n`
    }
  }

  return `
    <div class="section">
      <div class="section-header" onclick="toggle(this)">
        ${icon} ${thematique.title} (${totalCount} tests)
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="section-body collapsed">
        <table>
          <thead><tr><th>Critère</th><th>Description</th><th>Statut</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`
}

// Section warnings critiques
function buildWarningsSection() {
  if (uniqueWarnings.length === 0) return ''

  let rows = ''
  for (const critere of uniqueWarnings.sort()) {
    const details = warningsByCritere[critere]
    const severity = getSeverity(critere)
    const sevClass = getSeverityClass(severity)
    // Trouver la thématique
    const themeNum = parseInt(critere)
    const themeNames = {
      1: 'Images', 2: 'Cadres', 3: 'Couleurs', 4: 'Multimédia', 5: 'Tableaux',
      6: 'Liens', 7: 'Scripts', 8: 'Éléments obligatoires', 9: 'Structuration',
      10: 'Présentation', 11: 'Formulaires', 12: 'Navigation', 13: 'Consultation'
    }
    const themeName = themeNames[themeNum] || '?'

    // Dédupliquer
    const uniqueDetails = [...new Set(details)]
    const summary = uniqueDetails.slice(0, 2).map(d => escapeHtml(d)).join('<br>')

    rows += `<tr>
      <td><strong>${critere}</strong></td>
      <td>${themeName}</td>
      <td>${summary}${uniqueDetails.length > 2 ? `<br><em style="color:#999">… +${uniqueDetails.length - 2}</em>` : ''}</td>
      <td><span class="status ${sevClass}">${severity}</span></td>
    </tr>\n`
  }

  return `
    <div class="section">
      <div class="section-header" onclick="toggle(this)">
        ⚠️ Warnings — Problèmes d'accessibilité détectés (${uniqueWarnings.length} critères, ${totalWarnings} occurrences)
        <span class="badge badge-warn">Action requise</span>
      </div>
      <div class="section-body">
        <table>
          <thead><tr><th>Critère</th><th>Thématique</th><th>Problème détecté</th><th>Sévérité</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`
}

// Section audit axe-core
function buildAxeSection() {
  if (axeViolations.length === 0) return ''

  let rows = ''
  for (const audit of axeViolations) {
    let violationDetails = audit.violations.map(v =>
      `<code>[${v.impact}]</code> ${escapeHtml(v.id)} — ${escapeHtml(v.description)} (RGAA : ${v.rgaa || '?'}, ${v.occurrences || '?'} occ.)`
    ).join('<br>')

    rows += `<tr>
      <td>${escapeHtml(audit.page)}</td>
      <td>${audit.count} violation(s)</td>
      <td>${violationDetails}</td>
    </tr>\n`
  }

  return `
    <div class="section">
      <div class="section-header" onclick="toggle(this)">
        🔍 Audit axe-core détaillé — Violations par page (${axeViolations.length} pages avec violations)
        <span class="badge badge-warn">Détails</span>
      </div>
      <div class="section-body collapsed">
        <table>
          <thead><tr><th>Page</th><th>Violations</th><th>Détails</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`
}

// Section critères nécessitant une vérification humaine
function buildHumanVerificationSection() {
  const humanCriteria = [
    { critere: '1.3', thematique: 'Images', raison: 'Vérifier la pertinence sémantique de l\'alternative textuelle (le test ne vérifie que l\'absence de noms de fichier)' },
    { critere: '1.6', thematique: 'Images', raison: 'Vérifier que les images complexes (infographies, graphiques) ont une description détaillée adéquate' },
    { critere: '1.7', thematique: 'Images', raison: 'Vérifier que la description détaillée est pertinente et complète par rapport au contenu de l\'image' },
    { critere: '1.8', thematique: 'Images', raison: 'Déterminer si une image contient du texte qui devrait être remplacé par du texte stylé en CSS' },
    { critere: '2.2', thematique: 'Cadres', raison: 'Vérifier que le titre de l\'iframe décrit correctement son contenu' },
    { critere: '3.1', thematique: 'Couleurs', raison: 'Vérifier que l\'information n\'est jamais donnée uniquement par la couleur (ex : états, graphiques)' },
    { critere: '3.3', thematique: 'Couleurs', raison: 'Mesurer le ratio de contraste ≥ 3:1 des composants d\'interface et éléments graphiques' },
    { critere: '4.1', thematique: 'Multimédia', raison: 'Vérifier la qualité et la complétude des transcriptions textuelles des médias temporels' },
    { critere: '4.2', thematique: 'Multimédia', raison: 'Vérifier que les sous-titres sont synchronisés, fidèles et complets' },
    { critere: '4.4', thematique: 'Multimédia', raison: 'Vérifier que l\'audiodescription est pertinente et complète' },
    { critere: '5.1', thematique: 'Tableaux', raison: 'Vérifier que le résumé d\'un tableau complexe décrit correctement sa structure' },
    { critere: '6.1', thematique: 'Liens', raison: 'Vérifier que l\'intitulé de chaque lien est explicite hors contexte ou dans son contexte' },
    { critere: '7.2', thematique: 'Scripts', raison: 'Vérifier que les alternatives aux scripts sont fonctionnellement équivalentes' },
    { critere: '7.4', thematique: 'Scripts', raison: 'Vérifier que les changements de contexte par script sont prévisibles et contrôlables par l\'utilisateur' },
    { critere: '8.2', thematique: 'Éléments obligatoires', raison: 'Valider le code source HTML avec le validateur W3C (pas seulement les doublons d\'ID)' },
    { critere: '8.7', thematique: 'Éléments obligatoires', raison: 'Vérifier que tous les passages en langue étrangère sont signalés avec l\'attribut lang' },
    { critere: '9.1', thematique: 'Structuration', raison: 'Vérifier que la hiérarchie des titres reflète correctement la structure du contenu' },
    { critere: '10.2', thematique: 'Présentation', raison: 'Vérifier que l\'ordre de lecture reste logique sans CSS (pas seulement la présence de texte)' },
    { critere: '10.6', thematique: 'Présentation', raison: 'Vérifier visuellement que les liens sont distinguables du texte (pas seulement par la couleur)' },
    { critere: '10.7', thematique: 'Présentation', raison: 'Vérifier visuellement que l\'indicateur de focus est suffisamment visible sur tous les éléments interactifs' },
    { critere: '10.11', thematique: 'Présentation', raison: 'Vérifier que tous les contenus sont accessibles sans scroll horizontal à 320px (pas seulement le body)' },
    { critere: '10.13', thematique: 'Présentation', raison: 'Vérifier que les contenus au survol/focus sont masquables (Échap), persistants et survolables' },
    { critere: '11.2', thematique: 'Formulaires', raison: 'Vérifier que les étiquettes sont pertinentes et compréhensibles pour l\'utilisateur' },
    { critere: '11.10', thematique: 'Formulaires', raison: 'Vérifier que les messages d\'erreur indiquent le format attendu et les moyens de correction' },
    { critere: '12.2', thematique: 'Navigation', raison: 'Vérifier la cohérence du menu de navigation sur l\'ensemble des pages (pas seulement 2 pages)' },
    { critere: '12.3', thematique: 'Navigation', raison: 'Vérifier que la page courante est signalée visuellement et programmatiquement' },
    { critere: '12.9', thematique: 'Navigation', raison: 'Tester manuellement l\'absence de piège clavier (Tab/Shift+Tab) sur toutes les pages' },
    { critere: '13.2', thematique: 'Consultation', raison: 'Vérifier que l\'indication d\'ouverture dans une nouvelle fenêtre est compréhensible' },
    { critere: '13.3', thematique: 'Consultation', raison: 'Vérifier l\'accessibilité des documents téléchargeables (PDF balisé, structure, etc.)' },
    { critere: '13.6', thematique: 'Consultation', raison: 'Vérifier que les contenus en mouvement peuvent être mis en pause, arrêtés ou masqués' },
  ]

  let rows = humanCriteria.map(c => `<tr>
    <td><strong>${c.critere}</strong></td>
    <td>${c.thematique}</td>
    <td>${escapeHtml(c.raison)}</td>
  </tr>`).join('\n')

  return `
    <div class="section">
      <div class="section-header" onclick="toggle(this)">
        👁️ Critères nécessitant une vérification humaine (${humanCriteria.length} critères)
        <span class="badge badge-warn">Audit manuel</span>
      </div>
      <div class="section-body collapsed">
        <p style="padding: 1rem 1.5rem; color: #555; font-size: 0.9rem;">
          Ces critères sont partiellement vérifiés par les tests automatisés, mais nécessitent une <strong>évaluation humaine</strong> 
          pour confirmer la conformité. Les tests automatiques détectent des signaux structurels, mais ne peuvent pas juger 
          de la <em>pertinence</em>, de la <em>compréhensibilité</em> ou de l\'<em>équivalence fonctionnelle</em>.
        </p>
        <table>
          <thead><tr><th>Critère</th><th>Thématique</th><th>Raison de la vérification manuelle</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`
}

// Section recommandations
function buildRecommendations() {
  const recommendations = []

  if (warningsByCritere['8.4'] || warningsByCritere['8.3']) {
    recommendations.push({ priority: 'P1', critere: '8.3/8.4', action: 'Ajouter <code>lang="fr"</code> sur la balise <code>&lt;html&gt;</code> de toutes les pages' })
  }
  if (warningsByCritere['9.2'] || warningsByCritere['12.6']) {
    recommendations.push({ priority: 'P1', critere: '9.2/12.6', action: 'Implémenter les landmarks HTML5 : <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;footer&gt;</code>' })
  }
  if (warningsByCritere['12.7']) {
    recommendations.push({ priority: 'P2', critere: '12.7', action: 'Ajouter un lien d\'évitement « Aller au contenu principal » en haut de page' })
  }
  if (warningsByCritere['1.1']) {
    const count = warningsByCritere['1.1'].length
    recommendations.push({ priority: 'P2', critere: '1.1', action: `Ajouter <code>aria-label</code> ou <code>&lt;title&gt;</code> aux ${count} SVG <code>role="img"</code> sans nom accessible` })
  }
  if (warningsByCritere['12.1']) {
    recommendations.push({ priority: 'P2', critere: '12.1', action: 'Implémenter un 2e système de navigation (recherche, fil d\'Ariane, ou plan du site)' })
  }
  if (warningsByCritere['3.2'] || warningsByCritere['3.1/3.2']) {
    recommendations.push({ priority: 'P3', critere: '3.2', action: 'Corriger les violations de contraste texte/arrière-plan' })
  }
  if (warningsByCritere['10.7']) {
    recommendations.push({ priority: 'P3', critere: '10.7', action: 'Vérifier la visibilité du focus (outline/box-shadow) sur les éléments interactifs' })
  }
  if (warningsByCritere['12.4']) {
    recommendations.push({ priority: 'P3', critere: '12.4', action: 'Ajouter un fil d\'Ariane (breadcrumb) sur les pages de navigation' })
  }
  if (warningsByCritere['12.5']) {
    recommendations.push({ priority: 'P3', critere: '12.5', action: 'Ajouter un lien vers le plan du site dans le footer ou la navigation' })
  }

  if (recommendations.length === 0) return ''

  let rows = recommendations.map(r => `<tr>
    <td><span class="status ${r.priority === 'P1' ? 'status-critical' : r.priority === 'P2' ? 'status-warn' : 'status-info'}">${r.priority}</span></td>
    <td>${r.critere}</td>
    <td>${r.action}</td>
  </tr>`).join('\n')

  return `
    <div class="section">
      <div class="section-header" onclick="toggle(this)">
        📋 Recommandations de remédiation
        <span class="badge badge-warn">Prioritaire</span>
      </div>
      <div class="section-body">
        <table>
          <thead><tr><th>Priorité</th><th>Critère</th><th>Action recommandée</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Assemblage du HTML ─────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport RGAA — cartes.gouv.fr</title>
  <style>
    :root {
      --color-pass: #2e7d32;
      --color-warn: #e65100;
      --color-fail: #c62828;
      --color-info: #1565c0;
      --color-critical: #b71c1c;
      --color-bg: #fafafa;
      --color-card: #ffffff;
      --color-border: #e0e0e0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Marianne', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-bg);
      color: #1a1a1a;
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 {
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
      color: #000091;
    }
    .subtitle {
      color: #666;
      margin-bottom: 2rem;
      font-size: 0.95rem;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1.2rem;
      text-align: center;
    }
    .summary-card .number {
      font-size: 2.5rem;
      font-weight: 700;
    }
    .summary-card .label { color: #666; font-size: 0.85rem; }
    .summary-card.pass .number { color: var(--color-pass); }
    .summary-card.warn .number { color: var(--color-warn); }
    .summary-card.fail .number { color: var(--color-fail); }
    .summary-card.info .number { color: var(--color-info); }

    .section {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .section-header {
      padding: 1rem 1.5rem;
      background: #f5f5f5;
      border-bottom: 1px solid var(--color-border);
      font-weight: 600;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-header:hover { background: #eeeeee; }
    .section-header .badge {
      font-size: 0.75rem;
      padding: 0.2em 0.6em;
      border-radius: 12px;
      font-weight: 500;
    }
    .badge-pass { background: #e8f5e9; color: var(--color-pass); }
    .badge-warn { background: #fff3e0; color: var(--color-warn); }
    .badge-fail { background: #ffebee; color: var(--color-fail); }

    .section-body { padding: 0; }
    .section-body.collapsed { display: none; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th, td {
      padding: 0.7rem 1rem;
      text-align: left;
      border-bottom: 1px solid #f0f0f0;
    }
    th {
      background: #fafafa;
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      color: #666;
    }
    tr:last-child td { border-bottom: none; }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 500;
      font-size: 0.85rem;
      padding: 0.15em 0.6em;
      border-radius: 4px;
    }
    .status-pass { color: var(--color-pass); background: #e8f5e9; }
    .status-warn { color: var(--color-warn); background: #fff3e0; }
    .status-fail { color: var(--color-fail); background: #ffebee; }
    .status-info { color: var(--color-info); background: #e3f2fd; }
    .status-critical { color: var(--color-critical); background: #ffebee; }

    .warn-detail {
      font-size: 0.82rem;
      color: #555;
      margin-top: 0.3rem;
      line-height: 1.4;
    }

    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-border);
      text-align: center;
      color: #999;
      font-size: 0.8rem;
    }
    .footer a { color: #000091; }

    @media (max-width: 768px) {
      body { padding: 1rem; }
      .summary { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🇫🇷 Rapport d'audit RGAA 4.1.2</h1>
    <p class="subtitle">
      Site testé : <strong>cartes.gouv.fr</strong> |
      Date : <strong>${dateStr}</strong> |
      Durée : ${duration} secondes |
      Pages testées : ${pagesTested}
    </p>

    <!-- Résumé -->
    <div class="summary">
      <div class="summary-card pass">
        <div class="number">${stats.tests}</div>
        <div class="label">Tests exécutés</div>
      </div>
      <div class="summary-card ${stats.failures > 0 ? 'fail' : 'pass'}">
        <div class="number">${stats.passes}</div>
        <div class="label">Tests passants</div>
      </div>
      <div class="summary-card warn">
        <div class="number">${totalWarnings}</div>
        <div class="label">Warnings RGAA</div>
      </div>
      <div class="summary-card info">
        <div class="number">${pagesTested}</div>
        <div class="label">Pages testées</div>
      </div>
    </div>

    ${buildWarningsSection()}

    ${thematiques.map((t, i) => buildThematiqueSection(t, i)).join('\n')}

    ${buildAxeSection()}

    ${buildHumanVerificationSection()}

    ${buildRecommendations()}

    <div class="footer">
      <p>Rapport généré automatiquement par les tests Cypress RGAA — <a href="https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/">RGAA 4.1.2</a></p>
      <p>Fichier source : <code>cypress/e2e/rgaa-criteres.cy.js</code> | ${stats.tests} tests sur 13 thématiques × ${pagesTested} pages</p>
      <p style="margin-top:0.5rem;">Généré le ${now.toISOString().replace('T', ' à ').substring(0, 19)} UTC</p>
    </div>
  </div>

  <script>
    function toggle(header) {
      const body = header.nextElementSibling;
      body.classList.toggle('collapsed');
    }
    // Ouvrir la section warnings par défaut
    document.querySelectorAll('.section-body:not(.collapsed)').forEach(el => {});
  </script>
</body>
</html>`

fs.writeFileSync(OUTPUT_FILE, html, 'utf8')
console.log(`✅ Rapport RGAA généré : ${OUTPUT_FILE}`)
console.log(`   ${stats.tests} tests | ${stats.passes} passants | ${stats.failures} échecs | ${totalWarnings} warnings`)
