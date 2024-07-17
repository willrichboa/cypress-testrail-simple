// @ts-check
const { getAuthorization } = require('./get-config')
const got = require('got')

async function getCase({ testRailInfo, caseId }) {
  const url = `${testRailInfo.host}/index.php?/api/v2/get_case/${caseId}`
  const authorization = getAuthorization(testRailInfo)

  // @ts-ignore
  return got(url, {
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
  }).json()
}

module.exports = { getCase }