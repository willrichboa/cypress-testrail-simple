// @ts-check
const debug = require('debug')('cypress-testrail-simple')
const { getAuthorization } = require('./get-config')
const got = require('got')

async function getCase({ testRailInfo, caseId }) {
  debug(
    'fetching cases for TestRail project %s',
    testRailInfo.projectId,
  )

  const url = `${testRailInfo.host}/index.php?/api/v2/get_case/${caseId}`
  const authorization = getAuthorization(testRailInfo)

  // @ts-ignore
  return got(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
  }).json()
}

module.exports = { getCase }