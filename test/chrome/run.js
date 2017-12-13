import fs from 'fs'
import net from 'net'
import tls from 'tls'
import startTls from './starttls'
import { pathOr } from 'ramda'
import { join } from 'path'
import { attachDebugger, setDebugHandler } from './remote-debugger.js'
import { PORT_NET, PORT_STARTTLS, PORT_TLS } from './constants'
import { launch } from 'chrome-launcher'

function createServers () {
  const key = fs.readFileSync(join(__dirname, '..', '..', 'crt', 'server.key'), 'utf8')
  const cert = fs.readFileSync(join(__dirname, '..', '..', 'crt', 'server.crt'), 'utf8')
  const s1 = net.createServer(socket => { socket.pipe(socket) })
  const s2 = tls.createServer({ key, cert }, socket => { socket.pipe(socket) })
  const s3 = startTls.createServer(socket => {
    socket.upgrade({ key, cert, requestCert: false, rejectUnauthorized: false }, () => {
      socket.pipe(socket)
    })
  })

  const servers = [[s1, PORT_NET], [s2, PORT_TLS], [s3, PORT_STARTTLS]]
  const startServers = () => Promise.all(servers.map(([server, port]) => new Promise((resolve, reject) => { server.listen(port, resolve) })))
  const stopServers = () => Promise.all(servers.map(([s, _]) => new Promise((resolve, reject) => { s.close(resolve) })))
  return { startServers, stopServers }
}

const { startServers, stopServers } = createServers()
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
