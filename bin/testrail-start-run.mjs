#!/usr/bin/env node

import { findCases } from './find-cases.mjs'
import { getAuthorization, getTestRailConfig } from "./get-config.mjs"
import { HTTPResponseError } from './HTTPResponseError.mjs'
import fg from 'fast-glob'

function findSpecs(pattern) {
  return fg(pattern, {
    absolute: true,
  })
}

async function startRun() {
  let specs = process.env.TESTRAIL_SPEC
  const name = process.env.TESTRAIL_RUN_NAME || 'Cypress Testrail Simple'
  const description = process.env.TESTRAIL_RUN_DESCRIPTION || 'Started by Cypress TestRail Simple'
  const automationCode = process.env.TESTRAIL_AUTOMATION_CODE || 0
  const testRailInfo = getTestRailConfig()
  const authorization = getAuthorization(testRailInfo)
  let postBodyJSON = {
    name: name,
    description: description,
    include_all: false,
  }
  // let the user pass the suite ID like TestRail shows it "S..."
  // or just the number
  if (testRailInfo.suiteId) {
    if (testRailInfo.suiteId.startsWith('S')) {
      testRailInfo.suiteId = testRailInfo.suiteId.substring(1)
    }
    postBodyJSON.suite_id = `${Number(testRailInfo.suiteId)}`
  } else if (process.env.TESTRAIL_SUITEID && process.env.TESTRAIL_SUITEID !== '') {
    const suiteId = process.env.TESTRAIL_SUITEID
    if (suiteId.startsWith('S')) {
      suiteId = suiteId.substring(1)
    }
    postBodyJSON.suite_id = `${Number(suiteId)}`
  }
  const foundSpecs = await findSpecs(specs)
  postBodyJSON.case_ids = findCases(foundSpecs)
  if (postBodyJSON.case_ids.length < 1) { throw new Error('can not open new run with no case_ids') }

  // get all the case ids and remove any that don't exist in the defined project and suite
  let done = false
  const foundIds = []
  const baseURL = `${testRailInfo.host}/index.php?`
  let getCasesURL = `${baseURL}/api/v2/get_cases/${testRailInfo.projectId}&suite_id=${postBodyJSON.suite_id}`
  while (done === false) {
    const response = await fetch(getCasesURL, { method: 'GET', headers: { authorization } })
    if (!response.ok) {
      throw new HTTPResponseError(response)
    }
    response.json()
      .then(
        (resp) => {
          resp.cases?.forEach(element => {
            if (automationCode && automationCode > 0) {
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
  postBodyJSON.case_ids.forEach((cid) => {
    if (foundIds.includes(cid)) {
      temp.push(cid)
      return
    }
  })
  postBodyJSON.case_ids = temp
  if (postBodyJSON.case_ids.length < 1) { console.error('no matching case ids found in TestRail.  abort run start'); return }

  const addRunUrl = `${testRailInfo.host}/index.php?/api/v2/add_run/${testRailInfo.projectId}`


  // now create the run
  const response = await fetch(addRunUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    body: JSON.stringify(postBodyJSON),
  })
  if (!response.ok) {
    console.error(JSON.stringify(response))
    throw new HTTPResponseError(response)
  }
  return response.json()
    .then(
      (resp) => {
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
await startRun()