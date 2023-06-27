# cypress-testrail-simple

> Simple upload of Cypress test results to TestRail

forked from [cypress-testrail-simple](https://github.com/bahmutov/cypress-testrail-simple)

## Install

Add this plugin as a dependency

```
# If using NPM
$ npm i -D git+ssh://git@github.com/willrichboa/cypress-testrail-simple.git
```

### Cypress v10+

Include this plugin from your `cypress.config.js` file E2E (or component tests) Node callback

Note that you can only have one instance of on('after:spec'=> {}) or on('before:run'=> {}), so you need to combine them if you have more.

```js
// cypress.config.js
const { defineConfig } = require('cypress')
const { parseResults, registerPlugin, sendTestResults } = require('cypress-testrail-simple/src/plugin')

module.exports = defineConfig({
  e2e: {
    // other settings, like baseUrl
    setupNodeEvents: async (on, config) => {
      on('before:run', async () => {
        // https://github.com/willrichboa/cypress-testrail-simple
        await registerPlugin(process.env.TESTRAIL_RUN_ID==='')
      })
      on('after:spec', async (test, runnable) => {
        // https://github.com/willrichboa/cypress-testrail-simple
        await sendTestResults(test, runnable, process.env.TESTRAIL_RUN_ID==='')
    },
  },
})
```

### Cypress before v10

Add the plugin to your Cypress plugin file

```js
const cypressTestrailSimple = require('cypress-testrail-simple/src/plugin')
// cypress/plugins/index.js
module.exports = async (on, config) => {
    on('before:run', async () => {
      // https://github.com/willrichboa/cypress-testrail-simple
      await registerPlugin()
    })
    on('after:spec', async (test, runnable) => {
      // https://github.com/willrichboa/cypress-testrail-simple
      const testRailResults = parseResults(test, runnable)
      if (testRailResults.length) {
        await sendTestResults(testRailResults)
      }
    })
}
```

## Example script to run the tests in CI

execute_tests_with_testrail_reporting.sh
```sh
#!/bin/sh

SPECS=$1

##TESTRAIL Environment variables
export TESTRAIL_HOST=$TESTRAIL_HOST
export TESTRAIL_USERNAME=$TESTRAIL_USERNAME
export TESTRAIL_PASSWORD=$TESTRAIL_PASSWORD
export TESTRAIL_PROJECTID=$TESTRAIL_PROJECTID
export TESTRAIL_SUITEID=$TESTRAIL_SUITEID
export TESTRAIL_RUN_ID=$TESTRAIL_RUN_ID

## starts a test rail test run if all credentails exists and stores the run id in the env var
if [ -z "$TESTRAIL_HOST" ] || [ -z "$TESTRAIL_USERNAME" ] || [ -z "$TESTRAIL_PASSWORD" ] || [ -z "$TESTRAIL_PROJECTID" ] || [ -z "$TESTRAIL_SUITEID" ]
then
  echo "did not find all required testrail credentials. skipping testrail reporting."
  export TESTRAIL_RUN_ID=""
else
  if [ -z "$TESTRAIL_RUN_ID" ]
  then
    echo "did not find an existing testrail run id. creating new testrail test run"
    export TESTRAIL_RUN_ID=$(npx testrail-start-run --spec "$SPECS" --name "Automated Test Run" --description "specs $SPECS")
  fi
fi

exit_code=0
npx cypress run || exit_code=$?

## close the test run - needs a run id to exist. 
## use the force flag to force it to close even if there are some test cases that were not executed.
if [ -z "$TESTRAIL_HOST" ] || [ -z "$TESTRAIL_USERNAME" ] || [ -z "$TESTRAIL_PASSWORD" ] || [ -z "$TESTRAIL_PROJECTID" ] || [ -z "$TESTRAIL_SUITEID" ]
then
  echo "did not find all required testrail credentials. skipping testrail reporting."
else
  npx testrail-close-run --run $TESTRAIL_RUN_ID --force || true
fi

exit $exit_code

```


Cypress v10+
`bash execute_tests_with_testrail_reporting "cypress/e2e/**"`
Cypress v9 or lower
`bash execute_tests_with_testrail_reporting "cypress/integration/**"`


## Sending test results

During `cypress run` the plugin can send test results for each test case found in the test title using `C\d+` regular expression. To send the results, you need to pass the TestRail run ID. 



## MIT License

Copyright (c) 2023 W. Rich

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
