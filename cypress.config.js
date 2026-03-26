const { defineConfig } = require('cypress')

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
      on('task', {
        log(message) {
          console.log(message)
          return null
        }
      })
    },
  },
})
