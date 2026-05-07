#!/usr/bin/env node
/**
 * Génère un export PDF du rapport RGAA à partir du fichier HTML.
 *
 * Usage :
 *   node scripts/generate-rgaa-pdf.js
 *
 * Prérequis :
 *   - Le fichier cypress/reports/rgaa-report.html doit exister
 *   - Google Chrome doit être installé
 */

const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const REPORTS_DIR = path.resolve(__dirname, '..', 'cypress', 'reports')
const HTML_FILE = path.join(REPORTS_DIR, 'rgaa-report.html')
const PDF_FILE = path.join(REPORTS_DIR, 'rgaa-report.pdf')

// Trouver Chrome
function findChrome() {
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

async function generatePDF() {
  if (!fs.existsSync(HTML_FILE)) {
    console.error('❌ Rapport HTML introuvable:', HTML_FILE)
    console.error('   Lancez d\'abord : npm run test:rgaa')
    process.exit(1)
  }

  const chromePath = findChrome()
  if (!chromePath) {
    console.error('❌ Google Chrome introuvable. Installez Chrome ou Chromium.')
    process.exit(1)
  }

  console.log('📄 Génération du PDF...')
  console.log(`   Source : ${HTML_FILE}`)
  console.log(`   Chrome : ${chromePath}`)

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  const htmlUrl = `file://${HTML_FILE}`
  await page.goto(htmlUrl, { waitUntil: 'networkidle0' })

  await page.pdf({
    path: PDF_FILE,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="width:100%; text-align:center; font-size:9px; color:#666; padding:5px 0;">
        Rapport RGAA — cartes.gouv.fr — Page <span class="pageNumber"></span>/<span class="totalPages"></span>
      </div>
    `
  })

  await browser.close()

  const stats = fs.statSync(PDF_FILE)
  const sizeKB = (stats.size / 1024).toFixed(0)
  console.log(`✅ PDF généré : ${PDF_FILE} (${sizeKB} Ko)`)
}

generatePDF().catch((err) => {
  console.error('❌ Erreur lors de la génération du PDF:', err.message)
  process.exit(1)
})
