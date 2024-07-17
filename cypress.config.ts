import { defineConfig } from 'cypress'
import { registerPlugin } from './src/plugin.js'

const skipTestRailReporterPlugin = !process.env.TESTRAIL_RUN_ID

export default defineConfig({
  video: false,
  e2e: {
    specPattern: 'cypress/e2e/*.{js,jsx,ts,tsx}',
    async setupNodeEvents(on, config) {
      on('before:run', async () => {
        await registerPlugin(skipTestRailReporterPlugin)
      })
    }
  }
})
