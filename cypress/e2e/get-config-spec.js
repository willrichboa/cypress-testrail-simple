/// <reference types="cypress" />

import { getAuthorization, getTestRailConfig } from '../../src/get-config'


describe('get-config tests', () => {
  it('getTestRailConfig', () => {
    process.env.TESTRAIL_HOST = 'https://any'
    process.env.TESTRAIL_USERNAME = 'any'
    process.env.TESTRAIL_PASSWORD = 'any'
    process.env.TESTRAIL_PROJECTID = 'any'
    cy.wrap(getTestRailConfig()).then(gotConfig => {
      const expectedConfig = {
        host: process.env.TESTRAIL_HOST,
        username: process.env.TESTRAIL_USERNAME,
        password: process.env.TESTRAIL_PASSWORD,
        projectId: process.env.TESTRAIL_PROJECTID,
        suiteId: process.env.TESTRAIL_SUITEID,
        statusOverride: {},
      }
      expectedConfig.statusOverride = gotConfig.statusOverride
      cy.wrap(gotConfig).should('deep.equal', expectedConfig)
    })
  })
  it('getTestRailConfig TESTRAIL_HOST', () => {
    process.env.TESTRAIL_HOST = undefined
    process.env.TESTRAIL_USERNAME = 'any'
    process.env.TESTRAIL_PASSWORD = 'any'
    process.env.TESTRAIL_PROJECTID = 'any'
    cy.wrap(getTestRailConfig).should('throw', 'TESTRAIL_HOST is required')
  })
  it('getTestRailConfig TESTRAIL_USERNAME', () => {
    process.env.TESTRAIL_HOST = 'https://any'
    process.env.TESTRAIL_USERNAME = undefined
    process.env.TESTRAIL_PASSWORD = 'any'
    process.env.TESTRAIL_PROJECTID = 'any'
    cy.wrap(getTestRailConfig).should('throw', 'TESTRAIL_USERNAME is required')
  })
  it('getTestRailConfig TESTRAIL_PASSWORD', () => {
    process.env.TESTRAIL_HOST = 'https://any'
    process.env.TESTRAIL_USERNAME = 'any'
    process.env.TESTRAIL_PASSWORD = undefined
    process.env.TESTRAIL_PROJECTID = 'any'
    cy.wrap(getTestRailConfig).should('throw', 'TESTRAIL_PASSWORD is required. Could be an API key.')
  })
  it('getTestRailConfig TESTRAIL_PROJECTID', () => {
    process.env.TESTRAIL_HOST = 'https://any'
    process.env.TESTRAIL_USERNAME = 'any'
    process.env.TESTRAIL_PASSWORD = 'any'
    process.env.TESTRAIL_PROJECTID = undefined
    cy.wrap(getTestRailConfig).should('throw', 'TESTRAIL_PROJECTID is required.')
  })
  it('getTestRailConfig HOST does not have https', () => {
    process.env.TESTRAIL_HOST = 'any'
    process.env.TESTRAIL_USERNAME = 'any'
    process.env.TESTRAIL_PASSWORD = 'any'
    process.env.TESTRAIL_PROJECTID = 'any'
    cy.wrap(getTestRailConfig).should('throw', 'TESTRAIL_HOST should start with "https://')
  })
  it('getAuth', () => {
    process.env.TESTRAIL_HOST = 'https://any'
    process.env.TESTRAIL_USERNAME = 'any'
    process.env.TESTRAIL_PASSWORD = 'any'
    process.env.TESTRAIL_PROJECTID = 'any'
    cy.wrap(getTestRailConfig()).then(gotConfig => {
      cy.wrap(getAuthorization(gotConfig)).then(gotAuth => {
        cy.wrap(gotAuth).should('eq', `Basic ${Buffer.from(
          `${gotConfig.username}:${gotConfig.password}`,
        ).toString('base64')}`)
      })
    })
  })
})
