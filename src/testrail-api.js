const { getAuthorization } = require('./get-config')

const TestRailStatus = {
  Passed: 1,
  Blocked: 2,
  Untested: 3,
  Retest: 4,
  Failed: 5,
}

const TestRailStatusName = [
  null,
  'Passed',
  'Blocked',
  'Untested',
  'Retest',
  'Failed',
]

async function getTestRun(runId, testRailInfo) {
  const closeRunUrl = `${testRailInfo.host}/index.php?/api/v2/get_run/${runId}`
  const authorization = getAuthorization(testRailInfo)

  // @ts-ignore
  const gotResult = await require('got')(closeRunUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    // testrail could be in maintenance mode
    retry: {
      limit: 100,
      statusCodes: [
        409,
        429
      ],
    }
  })
  const json = gotResult.json()

  return json
}

/**
 * Gets the test results for the given TestRail test run.
 * Each result is an object with a case ID and a status ID.
 */
async function getTestRunResults(runId, testRailInfo) {
  const testRailApi = `${testRailInfo.host}/index.php?`

  // if there are more test results, need to call the API multiple times
  // and combine the results
  const runResultsUrl = `/api/v2/get_tests/${runId}`
  const authorization = getAuthorization(testRailInfo)

  // we will store the result in this list
  const allCases = []

  async function getPartResults(url) {
    // @ts-ignore
    const gotResult = await require('got')(testRailApi + url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        authorization,
      },
      // testrail could be in maintenance mode
      retry: {
        limit: 100,
        statusCodes: [
          409,
          429
        ],
      }
    })
    const json = gotResult.json()

    const cases = json.tests.map((t) => {
      const status = TestRailStatusName[t.status_id]
      if (!status) {
        console.error('Unknown TestRail test status %s', t.status_id)
      }
      return {
        case_id: t.case_id,
        status: status,
      }
    })

    allCases.push(...cases)

    if (json._links && json._links.next) {
      await getPartResults(json._links.next)
    }
  }

  await getPartResults(runResultsUrl)

  return allCases
}

/**
 * Returns just the list of case IDs listed in the given TestRail test run
 */
async function getCasesInTestRun(runId, testRailInfo) {
  const cases = await getTestRunResults(runId, testRailInfo)
  return cases.map((c) => c.case_id)
}

async function closeTestRun(runId, testRailInfo) {
  console.log(
    'closing the TestRail run %d for project %s',
    runId,
    testRailInfo.projectId,
  )
  const closeRunUrl = `${testRailInfo.host}/index.php?/api/v2/close_run/${runId}`
  const authorization = getAuthorization(testRailInfo)

  // @ts-ignore
  const gotResult = await require('got')(closeRunUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    json: {
      name: 'Started run',
      description: 'Checking...',
    },
  })
  const json = gotResult.json()

  return json
}

async function getTestSuite(suiteId, testRailInfo) {
  const getSuiteUrl = `${testRailInfo.host}/index.php?/api/v2/get_cases/${testRailInfo.projectId}&suite_id=${suiteId}`
  const authorization = getAuthorization(testRailInfo)

  // @ts-ignore
  const gotResult = await require('got')(getSuiteUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    // testrail could be in maintenance mode
    retry: {
      limit: 100,
      statusCodes: [
        409,
        429
      ],
    }
  })
  const json = gotResult.json()

  return json
}
async function postTestResults(resultsToSend, runID, testRailInfo) {
  const addResultsUrl = `${testRailInfo.host}/index.php?/api/v2/add_results_for_cases/${runID}`
  const authorization = getAuthorization(testRailInfo)

  // @ts-ignore
  const gotResult = await require('got')(addResultsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    json: {
      results: resultsToSend,
    },
  })
  const json = gotResult.json()

  return json
}

module.exports = {
  TestRailStatus,
  TestRailStatusName,
  getTestRun,
  closeTestRun,
  getTestSuite,
  getTestRunResults,
  getCasesInTestRun,
  postTestResults,
}
