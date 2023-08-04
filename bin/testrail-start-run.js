#!/usr/bin/env node

const fs = require('fs')
const arg = require('arg')
const got = require('got')
const findCypressSpecs = require('find-cypress-specs')
const { getTestRailConfig, getAuthorization } = require('../src/get-config')
const { findCases } = require('../src/find-cases')
const fg = require('fast-glob')

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
    // do not contact testrail, display info
    '--dry': Boolean,
    // do not open the test run, just find everything
    '--dry-tr': Boolean,
    // only get automated tests with the matching custom_automation_id
    '--auto': Number,
    // aliases
    '-s': '--spec',
    '-n': '--name',
    '-d': '--description',
    '-st': '--suite',
  },
  { permissive: true },
)
function findSpecs(pattern) {
  return fg(pattern, {
    absolute: true,
  })
}
async function startRun(caseIds = []) {
  const postBodyJSON = { name: '', description: '', include_all: true, case_ids: [], suite_id: undefined }
  let automation_code
  // dedupe the user provided case id list
  if (caseIds && caseIds.length > 0) {
    const uniqueCaseIds = [...new Set(caseIds)]
    if (uniqueCaseIds.length !== caseIds.length) {
      console.error('Removed duplicate case IDs')
      console.error('have %d case IDs', uniqueCaseIds.length)
    }
    postBodyJSON.include_all = false
    postBodyJSON.case_ids = uniqueCaseIds
  }

  let auto = args['--auto']
  if (auto) {
    automation_code = Number(auto)
    postBodyJSON.include_all = false
  }
  if (args['--dry']) {
    console.log('Dry run, not starting a new run')
    console.log('automation code', automation_code)
    console.log('POST body so far')
    console.info(postBodyJSON)
    return
  }

  const testRailInfo = getTestRailConfig()
  const authorization = getAuthorization(testRailInfo)

  // get all the case ids and remove any that dont exist in the defined project and suite
  let done = false
  const foundIds = []
  const baseURL = `${testRailInfo.host}/index.php?`
  let getCasesURL = `${baseURL}/api/v2/get_cases/${testRailInfo.projectId}&suite_id=${postBodyJSON.suite_id || process.env.TESTRAIL_SUITEID}`
  while (done === false) {
    await got(getCasesURL, { method: 'GET', headers: { authorization } })
      .json()
      .then(
        (resp) => {
          resp.cases?.forEach(element => {
            if (automation_code) {
              if (element.is_deleted === 0 && element.custom_automation_type === automation_code) {
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

  // optional arguments
  postBodyJSON.name = args['--name'] || args._[0]
  postBodyJSON.description = args['--description'] || args._[1]
  const addRunUrl = `${testRailInfo.host}/index.php?/api/v2/add_run/${testRailInfo.projectId}`


  let suiteId = args['--suite'] || testRailInfo.suiteId
  if (suiteId) {
    // let the user pass the suite ID like the TestRail shows it "S..."
    // or just the number
    if (suiteId.startsWith('S')) {
      suiteId = suiteId.substring(1)
    }
    postBodyJSON.suite_id = Number(suiteId)
    // await getTestSuite(suiteId, testRailInfo)
  }

  if (args['--dry-tr']) {
    console.log('Dry run, not starting a new run')
    console.log('addRunURL', addRunUrl)
    console.log('automation code', automation_code)
    console.log('POST body')
    console.info(postBodyJSON)
    return
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

if (args['--find-specs']) {
  const specs = findCypressSpecs.getSpecs()

  let tagged
  if (args['--tagged']) {
    tagged = args['--tagged']
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const caseIds = findCases(specs, fs.readFileSync, tagged)
  runConfig
  return startRun(caseIds)

}
if (args['--spec']) {
  return findSpecs(args['--spec'])
    .then((specs) => {
      const caseIds = findCases(specs)
      return startRun(caseIds)
    })
}
// start a new test run for all test cases
return startRun()