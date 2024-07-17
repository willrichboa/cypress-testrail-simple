#!/usr/bin/env node

const { getTestRailConfig } = require('./../src/get-config')
const { getTestRun, closeTestRun } = require('./../src/testrail-api')


async function stopTestRailRun(runId = process.env.TESTRAIL_RUN_ID, force = process.env.TESTRAIL_RUN_FORCE_CLOSE || false) {


  if (!runId) {
    console.error('TESTRAIL_RUN_ID must be set')
    process.exit(0)
  }


  const testRailInfo = getTestRailConfig()

  getTestRun(runId, testRailInfo)
    .then((runInfo) => {
      if (runInfo.is_completed) {
        console.log('Run %d was already completed', runId)
        return
      }

      const allTestsDone = runInfo.untested_count === 0
      if (!allTestsDone) {
        console.log(
          'TestRail run %d still has %d untested cases',
          runId,
          runInfo.untested_count,
        )

        if (!force) {
          console.log('will not close the run')
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
                console.error('original message when trying to close the run')
                console.error(error)
                process.exit(1)
              })
          }
        )
    })
}
return stopTestRailRun()