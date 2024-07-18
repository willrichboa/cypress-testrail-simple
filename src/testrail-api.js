const { getAuthorization } = require('./get-config.js')

class HTTPResponseError extends Error {
  constructor(response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`)
    this.response = JSON.stringify(response, null, '/t')
  }
  response
}

const TestRailStatusName = [
  null,
  'Passed',
  'Blocked',
  'Untested',
  'Retest',
  'Failed',
]

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
    const response = await fetch(testRailApi + url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        authorization,
      },
    })
    if (!response.ok) {
      throw new HTTPResponseError(response)
    }
    const jsonBody = await response.json()
    const cases = jsonBody.tests.map((t) => {
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

    if (jsonBody._links && jsonBody._links.next) {
      await getPartResults(jsonBody._links.next)
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

async function postTestResults(resultsToSend, runID, testRailInfo) {
  const addResultsUrl = `${testRailInfo.host}/index.php?/api/v2/add_results_for_cases/${runID}`
  const authorization = getAuthorization(testRailInfo)

  // @ts-ignore
  const response = await fetch(addResultsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    body: JSON.stringify({
      results: resultsToSend,
    }),
  })
  if (!response.ok) {
    throw new HTTPResponseError(response)
  }
  return response.json()
}

module.exports = { postTestResults, getTestRunResults, getCasesInTestRun }
