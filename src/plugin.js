const { findCases } = require('../bin/find-cases.mjs')
const { getTestRailConfig } = require('./get-config.js')
const { getCasesInTestRun, postTestResults } = require('./testrail-api.js')

let _runId
let _caseIds

function getTestRunId(env = process.env) {
  // try to read the test run id from the environment
  if ('TESTRAIL_RUN_ID' in env && env.TESTRAIL_RUN_ID) {
    return parseInt(env.TESTRAIL_RUN_ID)
  }
  throw new Error('TESTRAIL_RUN_ID is required')
}
/**
 * Returns the TestRail case id number (if any) from the given full test title
 * @param {string} testTitle
 */
function getTestCases(testTitle) {
  const re = /\bC(?<caseId>\d+)\b/g
  const matches = [...testTitle.matchAll(re)]
  const ids = matches.map((m) => Number(m.groups.caseId))
  return Array.from(new Set(ids)).sort()
}

function parseResults(spec, results) {
  // find only the tests with TestRail case id in the test name
  const testRailResults = []
  results.tests.forEach((result) => {
    /**
     *  Cypress to TestRail Status Mapping
     *
     *  | Cypress status | TestRail Status | TestRail Status ID |
     *  | -------------- | --------------- | ------------------ |
     *  | created        | Untested        | 3                  |
     *  | Passed         | Passed          | 1                  |
     *  | Pending        | Blocked         | 2                  |
     *  | Skipped        | Retest          | 4                  |
     *  | Failed         | Failed          | 5                  |
     *
     *  Each test starts as "Untested" in TestRail.
     *  @see https://glebbahmutov.com/blog/cypress-test-statuses/
     */
    const defaultStatus = {
      passed: 1,
      pending: 2,
      skipped: 4,
      failed: 5,
    }
    // override status mapping if defined by user
    const statusOverride = getTestRailConfig().statusOverride
    const status = {
      ...defaultStatus,
      ...statusOverride,
    }
    // only look at the test name, not at the suite titles
    const testName = result.title[result.title.length - 1]
    // there might be multiple test case IDs per test title
    const testCaseIds = getTestCases(testName)
    testCaseIds.forEach((case_id) => {
      const status_id = status[result.state] || defaultStatus.failed
      const errorVal = result.displayError ?
        `\n\n**Error**: \n> ${result.displayError
          .substring(0, result.displayError.indexOf('at '))}` :
        ''
      const testRailResult = {
        case_id: case_id,
        status_id: status_id,
        comment: `**Automated Test Title**: ${result.title.join('>')}${errorVal}`
      }

      testRailResults.push(testRailResult)
    })
  })
  return testRailResults
}

async function sendTestResults(spec, results, skipPlugin = false) {
  if (skipPlugin) { return }
  const testRailResults = parseResults(spec, results)

  if (!testRailResults.length) {
    return
  }
  console.log(
    'sending %d test results to TestRail for run %d',
    testRailResults.length,
    _runId,
  )

  return postTestResults(testRailResults, _runId, getTestRailConfig()).catch(
    (err) => {
      console.error('Error sending TestRail results')
      console.error(err)
      console.error(err.response.body)
      console.error(JSON.stringify(testRailResults))
    },
  )
}

async function registerPlugin(skipPlugin = false) {
  if (skipPlugin) { return }
  if (!process.env.TESTRAIL_RUN_ID) {
    console.log('testrail run id not found')
    return
  }
  _runId = getTestRunId()

  _caseIds = await getCasesInTestRun(_runId, getTestRailConfig())

  if (_caseIds.length < 1) { throw new Error('expected run to have at least one case id') }
}

module.exports = {
  parseResults,
  sendTestResults,
  registerPlugin,
  getTestCases
}