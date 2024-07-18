const { defineConfig } = require('cypress')
const { registerPlugin, sendTestResults } = require('./src/plugin.js')

module.exports = defineConfig({
  video: false,
  e2e: {
    specPattern: 'cypress/e2e/*.{js,jsx,ts,tsx}',
    async setupNodeEvents(on, config) {
      on('before:run', async () => {
        await registerPlugin(!process.env.TESTRAIL_RUN_ID)
      })
      on('after:spec', async (test, runResult) => {
        return sendTestResults(test, runResult, !process.env.TESTRAIL_RUN_ID)
      })
    }
  }
})
