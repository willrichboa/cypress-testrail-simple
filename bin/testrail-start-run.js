#!/usr/bin/env node

const got = require('got')
const { getTestRailConfig, getAuthorization } = require('./../src/get-config')

async function startRun(
  caseIds = [],
  name = process.env.TESTRAIL_RUN_NAME || 'Cypress Testrail Simple',
  description = process.env.TESTRAIL_RUN_DESCRIPTION || 'Started by Cypress TestRail Simple',
  automationCode = process.env.TESTRAIL_AUTOMATION_CODE || 0
) {
  const testRailInfo = getTestRailConfig()
  const authorization = getAuthorization(testRailInfo)
  const postBodyJSON = {
    name: name,
    description: description,
    include_all: automationCode === 0,
    case_ids: caseIds,
    suite_id: process.env.TESTRAIL_SUITEID || undefined
  }

  // dedupe the user provided case id list
  if (caseIds && caseIds.length > 0) {
    const uniqueCaseIds = [...new Set(caseIds)]
    if (uniqueCaseIds.length !== caseIds.length) {
      console.error('Removed duplicate case IDs')
      console.error('have %d case IDs', uniqueCaseIds.length)
      postBodyJSON.include_all = false
    }
    postBodyJSON.case_ids = uniqueCaseIds
  }

  // get all the case ids and remove any that don't exist in the defined project and suite
  let done = false
  const foundIds = []
  const baseURL = `${testRailInfo.host}/index.php?`
  let getCasesURL = `${baseURL}/api/v2/get_cases/${testRailInfo.projectId}&suite_id=${postBodyJSON.suite_id}`
  while (done === false) {
    await got(getCasesURL, { method: 'GET', headers: { authorization } })
      .json()
      .then(
        (resp) => {
          resp.cases?.forEach(element => {
            if (automationCode && automationCode !== 0) {
              if (element.is_deleted === 0 && element.custom_automation_type === automationCode) {
                foundIds.push(element.id)
              }
            } else {
              if (element.is_deleted === 0) {
                foundIds.push(element.id)
              }
            }
          })
          if (!resp._links || !resp._links?.next || resp._links?.next === '') {
            done = true
            return
          }
          getCasesURL = `${baseURL}${resp._links.next}`
        }
      )
  }
  const temp = []
  // compare ids from testrail with user provided list
  // add any that match
  if (caseIds && caseIds > 0) {
    postBodyJSON.case_ids.forEach((cid) => {
      if (foundIds.includes(cid)) {
        temp.push(cid)
        return
      }
    })
    postBodyJSON.case_ids = temp
  } else {
    // if no user provided list then use all found
    postBodyJSON.case_ids = foundIds
  }

  const addRunUrl = `${testRailInfo.host}/index.php?/api/v2/add_run/${testRailInfo.projectId}`


  if (testRailInfo.suiteId) {
    // let the user pass the suite ID like the TestRail shows it "S..."
    // or just the number
    if (suiteId.startsWith('S')) {
      suiteId = suiteId.substring(1)
    }
    postBodyJSON.suite_id = Number(suiteId)
  }

  // now create the run
  return got(addRunUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    json: postBodyJSON,
  })
    .json()
    .then(
      (resp) => {
        // console.info(resp)
        process.env.TESTRAIL_RUN_ID = resp.id
        console.log(resp.id)
      },
      (error) => {
        console.error('Could not create a new TestRail run')
        console.error('Response error name: %s', error.name)
        console.error('%o', error?.response?.body)
        console.error('Please check your TestRail configuration')
        if (postBodyJSON.case_ids) {
          console.error('and the case IDs: %s', JSON.stringify(postBodyJSON.case_ids))
        }
        process.exit(1)
      },
    )
}
return startRun()