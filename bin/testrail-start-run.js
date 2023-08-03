#!/usr/bin/env node

const fs = require('fs')
const arg = require('arg')
const debug = require('debug')('cypress-testrail-simple')
const got = require('got')
const findCypressSpecs = require('find-cypress-specs')
const { getTestRailConfig, getAuthorization } = require('../src/get-config')
const { findCases } = require('../src/find-cases')
const { getTestSuite } = require('../src/testrail-api')

const args = arg(
  {
    '--spec': String,
    '--name': String,
    '--description': String,
    '--suite': String,
    // find the specs automatically using
    // https://github.com/bahmutov/find-cypress-specs
    '--find-specs': Boolean,
    // filter all found specs by the given tag(s)
    '--tagged': String,
    // do not open the test run, just find everything
    '--dry': Boolean,
    // aliases
    '-s': '--spec',
    '-n': '--name',
    '-d': '--description',
    '-st': '--suite',
  },
  { permissive: true },
)
async function startRun(caseIds, customAutomationType = 1) {

  const testRailInfo = getTestRailConfig()
  // optional arguments
  const name = args['--name'] || args._[0]
  const description = args['--description'] || args._[1]
  debug('args: %o', args)
  debug('run name: %s', name)
  debug('run description: %s', description)
  // only output the run ID to the STDOUT, everything else is logged to the STDERR
  console.error(
    'creating new TestRail run for project %s',
    testRailInfo.projectId,
  )
  if (caseIds && caseIds.length > 0) {
    console.error('With %d case IDs', caseIds.length)
  }

  const addRunUrl = `${testRailInfo.host}/index.php?/api/v2/add_run/${testRailInfo.projectId}`
  debug('add run url: %s', addRunUrl)
  const authorization = getAuthorization(testRailInfo)

  const json = {
    name,
    description,
  }
  // dedupe the user provided case id list
  if (caseIds && caseIds.length > 0) {
    const uniqueCaseIds = [...new Set(caseIds)]
    if (uniqueCaseIds.length !== caseIds.length) {
      console.error('Removed duplicate case IDs')
      console.error('have %d case IDs', uniqueCaseIds.length)
    }
    json.include_all = false
    json.case_ids = uniqueCaseIds
  }
  debug('add run params %o', json)

  let suiteId = args['--suite'] || testRailInfo.suiteId
  if (suiteId) {
    // let the user pass the suite ID like the TestRail shows it "S..."
    // or just the number
    if (suiteId.startsWith('S')) {
      suiteId = suiteId.substring(1)
    }
    json.suite_id = Number(suiteId)
    debug('suite id %d', json.suite_id)
    // simply print all test cases
    await getTestSuite(suiteId, testRailInfo)
  }

  if (args['--dry']) {
    console.log('Dry run, not starting a new run')
    console.log(addRunUrl)
    console.info(json.case_ids)
    return
  }

  // get all the case ids and remove any that dont exist in the defined project and suite
  let done = false
  const foundIds = []
  const baseURL = `${testRailInfo.host}/index.php?`
  let getCasesURL = `${baseURL}/api/v2/get_cases/${testRailInfo.projectId}&suite_id=${json.suite_id || process.env.TESTRAIL_SUITEID}`
  while (done === false) {
    await got(getCasesURL, { method: 'GET', headers: { authorization } })
      .json()
      .then(
        (json) => {
          json.cases?.forEach(element => {
            if (element.is_deleted === 0 &&
              element.custom_automation_type === customAutomationType &&
              !element.custom_inactive_test_case) {
              foundIds.push(element.id)
            }
          });
          if (!json._links || !json._links?.next || json._links?.next === '') {
            done = true
            return
          }
          getCasesURL = `${baseURL}${json._links.next}`
        }
      )
  }
  const temp = []
  // compare ids from testrail with user list
  if (caseIds && caseIds > 0) {
    json.case_ids.forEach((cid) => {
      if (foundIds.includes(cid)) {
        temp.push(cid)
        return
      }
    })
    json.case_ids = temp
  } else {
    // if no user provided list then use all found
    json.case_ids = foundIds
  }

  // now create the run
  return got(addRunUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization,
    },
    json,
  })
    .json()
    .then(
      (json) => {
        debug('response from the add_run')
        debug('%o', json)
        process.env.TESTRAIL_RUN_ID = json.id
        console.log(json.id)
      },
      (error) => {
        console.error('Could not create a new TestRail run')
        console.error('Response error name: %s', error.name)
        console.error('%o', error.response.body)
        console.error('Please check your TestRail configuration')
        if (json.case_ids) {
          console.error('and the case IDs: %s', JSON.stringify(json.case_ids))
        }
        process.exit(1)
      },
    )
}

if (args['--find-specs']) {
  const specs = findCypressSpecs.getSpecs()
  debug('found %d Cypress specs', specs.length)
  debug(specs)

  let tagged
  if (args['--tagged']) {
    tagged = args['--tagged']
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    debug('tagged: %o', tagged)
  }
  const caseIds = findCases(specs, fs.readFileSync, tagged)
  debug('found %d TestRail case ids: %o', caseIds.length, caseIds)
  runConfig
  return startRun(caseIds)

}
if (args['--spec']) {
  return findSpecs(args['--spec'])
    .then((specs) => {
      debug('using pattern "%s" found specs', args['--spec'])
      debug(specs)
      const caseIds = findCases(specs)
      debug('found %d TestRail case ids: %o', caseIds.length, caseIds)

      return startRun(caseIds)
    })
}
// start a new test run for all test cases
return startRun()
