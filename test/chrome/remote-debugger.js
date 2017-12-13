// taken from https://github.com/tejohnso/chrome-app-test-runner

import WebSocket from 'ws'
import { get } from 'http'

let ws
let messageHandler
let intervalHandler
let evalPromiseResolverObject = { resolve: 0 }

function createConnectionResponse (resolver, intervalHandler) {
  return function (resp) {
    var chunks = ''

    resp.on('data', function (data) {
      chunks += data
    })
    resp.on('end', function () {
      var inspectables

      inspectables = JSON.parse(chunks).filter(function (tabData) {
        return tabData.type === 'app'
      })[0]

      if (inspectables && inspectables.webSocketDebuggerUrl) {
        clearInterval(intervalHandler.handle)
        ws = new WebSocket(inspectables.webSocketDebuggerUrl)
        ws.onopen = function () {
          ws.send(JSON.stringify({ 'id': 1, 'method': 'Console.enable' }))
        }
        ws.onmessage = function (event) {
          var data = JSON.parse(event.data)

          if (data.id === 9) {
            return evalPromiseResolverObject.resolver(data.result.result.value)
          }
          messageHandler(data)
        }
        resolver()
      }
    })
  }
}

function createErrorResponse (rejecter) {
  return function (resp) {
    console.log(resp)
    clearInterval(intervalHandler.handle)
    rejecter()
  }
}

export function attachDebugger () {
  return new Promise(function (resolve, reject) {
    intervalHandler = { handle: 0 }
    let connectionResponse = createConnectionResponse(resolve, intervalHandler)
    let errorResponse = createErrorResponse(reject)

    intervalHandler.handle = setInterval(function () {
      get('http://localhost:9222/json/list', connectionResponse)
        .on('error', errorResponse)
    }, 500)
  })
}

export function setDebugHandler (handler) {
  messageHandler = handler
}
