const { defineConfig } = require('cypress')

module.exports = defineConfig({
  projectId: 'ejionw',
  e2e: {
    experimentalPromptCommand: true,
    baseUrl: 'https://cartes.gouv.fr',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 120000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
})
