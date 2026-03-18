const { defineConfig } = require('cypress')

module.exports = defineConfig({
  projectId: '66ited',
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
