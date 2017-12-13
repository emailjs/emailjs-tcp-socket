(function () {
  'use strict'
  window.mocha.run(function (failureCount) {
    if (!failureCount) {
      console.log('All tests passed!')
    } else {
      console.log('Failure count: ' + failureCount)
    }
  })
})()
