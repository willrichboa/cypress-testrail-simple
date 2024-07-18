#!/bin/sh

##create an file called testrail.env with the host url, username, password, project, and suitid
## should be format TESTRAIL_USERNAME=x@y.z
source testrail.env

##TESTRAIL Environment variables
export TESTRAIL_RUN_ID=''
export TESTRAIL_SPEC=$1
export TESTRAIL_HOST=$TESTRAIL_HOST
export TESTRAIL_USERNAME=$TESTRAIL_USERNAME
export TESTRAIL_PASSWORD=$TESTRAIL_PASSWORD
export TESTRAIL_PROJECTID=$TESTRAIL_PROJECTID
export TESTRAIL_SUITEID=$TESTRAIL_SUITEID
export TESTRAIL_RUN_ID=""
export TESTRAIL_RUN_FORCE_CLOSE=true
export TESTRAIL_AUTOMATION_CODE=$TESTRAIL_AUTOMATION_CODE

## starts a test rail test run and stores the run id in the env var
if [ -z "$TESTRAIL_HOST" ] || [ -z "$TESTRAIL_USERNAME" ] || [ -z "$TESTRAIL_PASSWORD" ] || [ -z "$TESTRAIL_PROJECTID" ] || [ -z "$TESTRAIL_SUITEID" ]; then
  echo "did not find all required testrail credentials. skipping testrail reporting."
else
  if [ -z "$TESTRAIL_RUN_ID" ]; then
    echo "did not find an existing testrail run id. creating new testrail test run"
    export TESTRAIL_RUN_ID=$(npx testrail-start-run)
  fi
fi

## run tests here

## close the test run - needs a run id. use force to close even if there are some test cases were not executed.
if [ -z "$TESTRAIL_HOST" ] || [ -z "$TESTRAIL_USERNAME" ] || [ -z "$TESTRAIL_PASSWORD" ] || [ -z "$TESTRAIL_PROJECTID" ] || [ -z "$TESTRAIL_SUITEID" ]; then
  echo "did not find all required testrail credentials. skipping testrail reporting."
else
  npx testrail-close-run || true
fi
