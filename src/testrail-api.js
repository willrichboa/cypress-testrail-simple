const { getAuthorization } = require('./get-config.js')

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
        'Authorization': authorization,
      },
    })
    if (!response.ok) {
      console.log(await response.text())
      throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`)
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
  const postBody = {
    results: resultsToSend,
  }

  const response = await fetch(addResultsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
    },
    body: JSON.stringify(postBody),
  })
  if (!response.ok) {
    console.log(await response.text())
    throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

module.exports = { postTestResults, getTestRunResults, getCasesInTestRun }
