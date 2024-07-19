#!/usr/bin/env node

import { getAuthorization, getTestRailConfig } from "./get-config.mjs"

async function getTestRun(runId, testRailInfo) {
  const closeRunUrl = `${testRailInfo.host}/index.php?/api/v2/get_run/${runId}`
  const authorization = getAuthorization(testRailInfo)

  const response = await fetch(closeRunUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
    }
  })
  if (!response.ok) {
    console.log(await response.text())
    throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function closeTestRun(runId, testRailInfo) {
  console.log(
    'closing the TestRail run %d for project %s',
    runId,
    testRailInfo.projectId,
  )
  const closeRunUrl = `${testRailInfo.host}/index.php?/api/v2/close_run/${runId}`
  const authorization = getAuthorization(testRailInfo)

  const response = await fetch(closeRunUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
    },
    body: {
      name: 'Started run',
      description: 'Checking...',
    },
  })
  if (!response.ok) {
    console.log(await response.text())
    throw new Error(`HTTP Error Response: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function stopTestRailRun(runId = process.env.TESTRAIL_RUN_ID, force = process.env.TESTRAIL_RUN_FORCE_CLOSE || false) {


  if (!runId) {
    console.error('TESTRAIL_RUN_ID must be set. exiting')
    process.exit(0)
  }


  const testRailInfo = getTestRailConfig()

  getTestRun(runId, testRailInfo)
    .then((runInfo) => {
      if (runInfo.is_completed) {
        console.error('Run %d was already completed', runId)
        return
      }

      const allTestsDone = runInfo.untested_count === 0
      if (!allTestsDone) {
        console.error(
          'TestRail run %d still has %d untested cases',
          runId,
          runInfo.untested_count,
        )

        if (!force) {
          console.error('will not close the run as all tests are not done.  set TESTRAIL_RUN_FORCE_CLOSE=true to force close')
          return
        }
      }
      closeTestRun(runId, testRailInfo)
        .then((json) => {
          console.log('Closed run %d', json.id)
          console.log('name: %s', json.name)
          console.log('description: %s', json.description)
          console.log('passed tests: %d', json.passed_count)
          console.log('failed tests: %d', json.failed_count)
          console.log('blocked (pending) tests: %d', json.blocked_count)
          // untested count should be zero if all tests are done
          // or could be positive number if "--force" was used
          console.log('untested: %d', json.untested_count)
        },
          (error) => {
            // the error might be legit error, or the run was closed
            // while we were checking its status, let's try again
            return getTestRun(runId, testRailInfo)
              .then((runInfo) => {
                if (runInfo.is_completed) {
                  console.log('Run %d was already completed', runId)
                  return
                }
                throw error
              })
          }
        )
    })
}
await stopTestRailRun()