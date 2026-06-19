const { defineConfig } = require('cypress')
require('dotenv').config()
const http = require('http')
const https = require('https')
const { URL } = require('url')

module.exports = defineConfig({
  projectId: '66ited',
  // Reporter mochawesome pour générer des rapports HTML
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports/json',
    overwrite: false,
    html: false,
    json: true,
    timestamp: 'yyyy-mm-dd_HH-MM',
  },
  e2e: {
    experimentalPromptCommand: true,
    baseUrl: 'https://cartes.gouv.fr',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 120000,
    retries: {
      runMode: 2,   // CI : 2 retries automatiques par test
      openMode: 0   // Local : pas de retry
    },
    setupNodeEvents(on, config) {
      const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY

      /**
       * Appel API Anthropic avec support proxy (tunnel HTTP CONNECT)
       */
      function callClaude(messages) {
        const body = JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages
        })
        const headers = {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body)
        }

        if (proxyUrl) {
          const proxy = new URL(proxyUrl)
          return new Promise((resolve, reject) => {
            const req = http.request({
              host: proxy.hostname, port: proxy.port,
              method: 'CONNECT', path: 'api.anthropic.com:443'
            })
            req.on('connect', (_, socket) => {
              const apiReq = https.request({
                hostname: 'api.anthropic.com', path: '/v1/messages',
                method: 'POST', headers, socket, agent: false
              }, (res) => {
                let data = ''
                res.on('data', c => data += c)
                res.on('end', () => resolve(JSON.parse(data)))
              })
              apiReq.on('error', reject)
              apiReq.write(body)
              apiReq.end()
            })
            req.on('error', reject)
            req.end()
          })
        }
        // Sans proxy : appel direct
        return new Promise((resolve, reject) => {
          const apiReq = https.request({
            hostname: 'api.anthropic.com', path: '/v1/messages',
            method: 'POST', headers
          }, (res) => {
            let data = ''
            res.on('data', c => data += c)
            res.on('end', () => resolve(JSON.parse(data)))
          })
          apiReq.on('error', reject)
          apiReq.write(body)
          apiReq.end()
        })
      }

      /**
       * Télécharge une image via proxy et retourne le base64 + media type
       */
      function downloadImageBase64(imageUrl) {
        const u = new URL(imageUrl)
        const doRequest = (hostname, path, search) => {
          if (proxyUrl) {
            const proxy = new URL(proxyUrl)
            return new Promise((resolve, reject) => {
              const req = http.request({
                host: proxy.hostname, port: proxy.port,
                method: 'CONNECT', path: hostname + ':443'
              })
              req.on('connect', (_, socket) => {
                const imgReq = https.request({
                  hostname, path: path + (search || ''),
                  method: 'GET',
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                  socket, agent: false
                }, (res) => {
                  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const loc = new URL(res.headers.location, imageUrl)
                    doRequest(loc.hostname, loc.pathname, loc.search).then(resolve).catch(reject)
                    return
                  }
                  const chunks = []
                  res.on('data', c => chunks.push(c))
                  res.on('end', () => {
                    const buf = Buffer.concat(chunks)
                    const ct = (res.headers['content-type'] || 'image/jpeg').split(';')[0]
                    resolve({ data: buf.toString('base64'), mediaType: ct })
                  })
                })
                imgReq.on('error', reject)
                imgReq.end()
              })
              req.on('error', reject)
              req.end()
            })
          }
          // Sans proxy
          return new Promise((resolve, reject) => {
            https.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadImageBase64(res.headers.location).then(resolve).catch(reject)
                return
              }
              const chunks = []
              res.on('data', c => chunks.push(c))
              res.on('end', () => {
                const buf = Buffer.concat(chunks)
                const ct = (res.headers['content-type'] || 'image/jpeg').split(';')[0]
                resolve({ data: buf.toString('base64'), mediaType: ct })
              })
            }).on('error', reject)
          })
        }
        return doRequest(u.hostname, u.pathname, u.search)
      }

      on('task', {
        log(message) {
          console.log(message)
          return null
        },

        /**
         * Analyse une image via Claude Vision pour vérifier la pertinence de l'alt text
         */
        async analyzeAltRelevance({ imageUrl, altText }) {
          if (!process.env.ANTHROPIC_API_KEY) {
            return { pertinent: true, reason: 'Clé API non configurée — test ignoré', suggestedAlt: '' }
          }
          try {
            const img = await downloadImageBase64(imageUrl)
            if (!img.data || img.data.length < 100 || !img.mediaType.startsWith('image/')) {
              return { pertinent: true, reason: `Image non téléchargeable (${img.mediaType})`, suggestedAlt: '' }
            }
            const response = await callClaude([{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } },
                { type: 'text', text: `Tu es un expert en accessibilité web (RGAA critère 1.3). Analyse cette image et évalue si le texte alternatif suivant est pertinent.\n\nTexte alternatif : "${altText}"\n\nRéponds UNIQUEMENT en JSON valide (sans markdown) :\n{"pertinent": true/false, "reason": "explication courte", "suggestedAlt": "suggestion si non pertinent, sinon vide"}` }
              ]
            }])
            const text = response.content?.[0]?.text?.trim()
            if (!text) return { pertinent: true, reason: `Réponse API inattendue: ${JSON.stringify(response)}`, suggestedAlt: '' }
            return JSON.parse(text)
          } catch (e) {
            console.log(`⚠️  Claude Vision erreur pour ${imageUrl}: ${e.message}`)
            return { pertinent: true, reason: `Erreur: ${e.message}`, suggestedAlt: '' }
          }
        },

        /**
         * Détecte si une image contient du texte qui devrait être en HTML/CSS (RGAA 1.8)
         */
        async detectTextInImage({ imageUrl }) {
          if (!process.env.ANTHROPIC_API_KEY) {
            return { hasText: false, textContent: '', shouldBeHtml: false, reason: 'Clé API non configurée' }
          }
          try {
            const img = await downloadImageBase64(imageUrl)
            if (!img.data || img.data.length < 100 || !img.mediaType.startsWith('image/')) {
              return { hasText: false, textContent: '', shouldBeHtml: false, reason: `Image non téléchargeable (${img.mediaType})` }
            }
            const response = await callClaude([{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } },
                { type: 'text', text: `Tu es un expert en accessibilité web (RGAA critère 1.8). Analyse cette image et détecte si elle contient du texte qui pourrait/devrait être rendu en HTML/CSS plutôt qu'en image.\n\nExceptions acceptées : logos, marques, texte faisant partie d'une photo réelle, texte sur un fond graphique complexe impossible à reproduire en CSS.\n\nRéponds UNIQUEMENT en JSON valide (sans markdown) :\n{"hasText": true/false, "textContent": "texte détecté ou vide", "shouldBeHtml": true/false, "reason": "explication courte"}` }
              ]
            }])
            const text = response.content?.[0]?.text?.trim()
            if (!text) return { hasText: false, textContent: '', shouldBeHtml: false, reason: `Réponse API inattendue` }
            return JSON.parse(text)
          } catch (e) {
            console.log(`⚠️  Claude Vision erreur pour ${imageUrl}: ${e.message}`)
            return { hasText: false, textContent: '', shouldBeHtml: false, reason: `Erreur: ${e.message}` }
          }
        }
      })
      return config
    },
  },
})
