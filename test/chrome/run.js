import { pathOr } from 'ramda'
import { attachDebugger, setDebugHandler } from './remote-debugger.js'
import { launch } from 'chrome-launcher'
import echo from '../echo'

const { startServers, stopServers } = echo()
let chrome

startServers()
  .then(() => launch({ port: 9222, chromeFlags: [`--load-and-launch-app=${__dirname}`], enableExtensions: true }))
  .then(child => { chrome = child })
  .then(() => attachDebugger())
  .then(() => new Promise((resolve, reject) => {
    setDebugHandler(data => {
      var message = pathOr('', ['params', 'message', 'text'])(data)
      if (message === 'All tests passed!') {
        resolve(message)
      } else if (/Failure count: [\d]+/.test(message)) {
        reject(message)
      }
    })
  }))
  .then(msg => {
    console.log(msg)
    chrome.kill()
    stopServers()
    process.exit(0)
  })
  .catch(e => {
    console.error(e)
    chrome.kill()
    stopServers()
    process.exit(1)
  })
