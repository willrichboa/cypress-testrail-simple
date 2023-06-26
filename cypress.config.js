const { defineConfig } = require('cypress')
const cypressTestrailSimple = require('cypress-testrail-simple/src/plugin')

module.exports = defineConfig({
  fixturesFolder: false,
  projectId: '41cgid',
  video: false,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    async setupNodeEvents(on, config) {
      await cypressTestrailSimple(on, config, (process.env.TESTRAIL_RUN_ID === ''))
      return require('./cypress/plugins/index.js')(on, config)
    },
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
  },
})
