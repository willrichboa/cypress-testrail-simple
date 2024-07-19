#!/usr/bin/env node

import { findCases } from './find-cases.mjs'
import { getAuthorization, getTestRailConfig } from "./get-config.mjs"
import fg from 'fast-glob'

const testRailInfo = getTestRailConfig()
const authorization = getAuthorization(testRailInfo)

function findSpecs(pattern) {
  return fg(pattern, {
    absolute: true,
  })
}

async function getAllCasesNotDeleted(foundIds, getCasesURL) {
  const response = await fetch(getCasesURL, {
    method: 'GET',
    headers: {
      'Authorization': authorization
    }
  })
  if (!response.ok) {
    console.error(await response.text())
    throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`)
  }
  const getResp = await response.json()
  foundIds.push(...getResp.cases.map((c) => c.id))
  if (!getResp._links || !getResp._links?.next || getResp._links?.next === '') {
    return foundIds
  }
  getCasesURL = `${testRailInfo.host}/index.php?${getResp._links.next}`
  return getAllCasesNotDeleted(foundIds, getCasesURL)
}


async function startRun() {
  const specs = process.env.TESTRAIL_SPEC || 'cypress/{integration,e2e}/**'
  const name = process.env.TESTRAIL_RUN_NAME || 'Cypress Testrail Simple'
  const description = process.env.TESTRAIL_RUN_DESCRIPTION || 'Started by Cypress TestRail Simple'
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
  await findSpecs(specs).then((f) => {
    postBodyJSON.case_ids = findCases(f)
  })
  if (postBodyJSON.case_ids.length < 1) {
    throw new Error('can not open new run with no case_ids')
  }


  let foundIds = []
  const getCasesStartURL = `${testRailInfo.host}/index.php?/api/v2/get_cases/${testRailInfo.projectId}&suite_id=${postBodyJSON.suite_id}`
  foundIds = await getAllCasesNotDeleted(foundIds, getCasesStartURL)
  postBodyJSON.case_ids = postBodyJSON.case_ids.filter((c) => foundIds.includes(c))

  if (postBodyJSON.case_ids.length < 1) {
    console.error('no matching case ids found in TestRail.  abort run start')
    return
  }

  const addRunUrl = `${testRailInfo.host}/index.php?/api/v2/add_run/${testRailInfo.projectId}`


  // now create the run
  const response = await fetch(addRunUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
    },
    body: JSON.stringify(postBodyJSON),
  })
  if (!response.ok) {
    console.error(await response.text())
    throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`)
  }
  return response.json()
    .then(
      (resp) => {
        process.env.TESTRAIL_RUN_ID = resp.id
        console.log(resp.id)
      }
    )
}
await startRun()