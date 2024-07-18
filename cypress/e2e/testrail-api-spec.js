/// <reference types="cypress" />

import { getTestRailConfig } from '../../src/get-config'
import { getCasesInTestRun, getTestRunResults, postTestResults } from '../../src/testrail-api'

describe('testrail-api tests', () => {
  beforeEach(() => {
    process.env.TESTRAIL_HOST = 'https://any'
    process.env.TESTRAIL_USERNAME = 'any'
    process.env.TESTRAIL_PASSWORD = 'any'
    process.env.TESTRAIL_PROJECTID = 'any'
    cy.intercept('**/api/v2/get_tests/**',
      {
        body: {
          "offset": 0,
          "limit": 250,
          "size": 250,
          "_links": {
            "next": null,
            "prev": null
          },
          "tests": [
            {
              "case_id": 12345,
              "status_id": 3
            }
          ]
        }
      }
    )
  })
  it('getTestRunResults', () => {
    cy.wrap(getTestRailConfig()).then(gotConfig => {
      cy.wrap(getTestRunResults('any', gotConfig)).should('deep.eq', [{ case_id: 1918201, status: 'Untested' }])
    })
  })
  it('getCasesInTestRun', () => {
    cy.wrap(getTestRailConfig()).then(gotConfig => {
      cy.wrap(getTestRunResults('any', gotConfig))
        .then(gotTestRunResults => {
          cy.wrap(getCasesInTestRun('any', gotConfig)).should('deep.eq', [gotTestRunResults[0].case_id])
        })
    })

  })
  it('postTestResults', () => {
    const stubResp = { key: 'value' }
    cy.intercept('**/api/v2/add_results_for_cases/**', stubResp).as('add_results_for_cases')
    cy.wrap(getTestRailConfig()).then(gotConfig => {
      cy.wrap(postTestResults([{ resultsKey: 'resultsValue' }], 'any', gotConfig))
        .then((gotResultResp) => {
          cy.wrap(gotResultResp).should('deep.equal', stubResp)
        })
    })
  })
})