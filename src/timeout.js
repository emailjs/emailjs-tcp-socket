// setZeroTimeout slightly adapted from
// https://github.com/shahyar/setZeroTimeout-js (CC BY 3.0).
// Provides a function similar to setImmediate() on Chrome.
const timeouts = []
const msgName = 'hackyVersionOfSetImmediate'

function handleMessage (event) {
  if (event.source === window && event.data === msgName) {
    if (event.stopPropagation) {
      event.stopPropagation()
    }
    if (timeouts.length) {
      try {
        timeouts.shift()()
      } catch (e) {
        // Throw in an asynchronous closure to prevent setZeroTimeout from hanging due to error
        setTimeout((function (e) {
          return function () {
            throw e.stack || e
          }
        }(e)), 0)
      }
    }
    if (timeouts.length) { // more left?
      postMessage(msgName, '*')
    }
  }
}

window && window.addEventListener('message', handleMessage, true)

export default function postTimeout (fn) {
  timeouts.push(fn)
  postMessage(msgName, '*')
}
