const { defineConfig } = require('cypress')
const { registerPlugin } = require('./src/plugin.cjs')

module.exports = defineConfig({
  fixturesFolder: false,
  projectId: '41cgid',
  video: false,
  e2e: {
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    async setupNodeEvents(on, config) {
      await registerPlugin(on, config, (process.env.TESTRAIL_RUN_ID === ''))
      return config
    },
  },
})
