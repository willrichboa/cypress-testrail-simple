/// <reference types="cypress" />

const debug = require('debug')('cypress-testrail-simple/plugin')
const got = require('got')
const {
  getTestRailConfig,
  getAuthorization,
  getTestRunId,
} = require('./get-config')
const { getCasesInTestRun } = require('./testrail-api')
const { getTestCases } = require('./find-cases')

let _testRailInfo
let _runId
let _caseIds

function parseResults(spec, results) {
  debug(spec)
  debug(results)
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
    const statusOverride = _testRailInfo.statusOverride
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

      if (_caseIds.length && !_caseIds.includes(case_id)) {
        debug('case %d is not in test run %d', case_id, _runId)
      } else {
        testRailResults.push(testRailResult)
      }
    })
  })
  if (testRailResults.length) {
    debug('TestRail results in %s', spec.relative)
    console.table(testRailResults)
  }
  return testRailResults
}
async function sendTestResults(testResults) {
  console.log(
    'sending %d test results to TestRail for run %d',
    testResults.length,
    _runId,
  )
  const addResultsUrl = `${_testRailInfo.host}/index.php?/api/v2/add_results_for_cases/${_runId}`
  const authorization = getAuthorization(_testRailInfo)

  // @ts-ignore
  const json = await got(addResultsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    json: {
      results: testResults,
    },
  }).json().catch(
    (err) => {
      console.error('Error sending TestRail results')
      console.error(err)
      console.error(err.response.body)
      console.error(JSON.stringify(testRailResults))
    },
  )

  debug('TestRail response: %o', json)
}
async function registerPlugin() {
  if (!process.env.TESTRAIL_RUN_ID) {
    debug('test run id did not exist')
    return
  }
  _runId = parseInt(getTestRunId())

  _testRailInfo = getTestRailConfig()

  _caseIds = await getCasesInTestRun(_runId, _testRailInfo)
  if (_caseIds.length < 1) { throw new Error('expected run to have at least one case id') }
  debug('test run %d has %d cases', _runId, _caseIds.length)
  debug(_caseIds)
}

module.exports = { registerPlugin, parseResults, sendTestResults }
