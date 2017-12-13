const attachProxy = require('emailjs-tcp-proxy').default
const express = require('express')
const { Server } = require('http')
const path = require('path')
const net = require('net')
const tls = require('tls')
const fs = require('fs')
const { join } = require('path')
const { PORT_NET, PORT_TLS } = require('./test/ws/constants')

const key = fs.readFileSync(join(__dirname, 'crt', 'server.key'), 'utf8')
const cert = fs.readFileSync(join(__dirname, 'crt', 'server.crt'), 'utf8')
const ptEcho = net.createServer(socket => { socket.pipe(socket) })
const tlsEcho = tls.createServer({ key, cert }, socket => { socket.pipe(socket) })

const app = express()
const server = Server(app)
app.use('/', express.static(path.join(__dirname, 'test', 'ws')))
attachProxy(server)

exports.config = {
  specs: [
    './test/ws/*-integration.js'
  ],
  maxInstances: 1,
  capabilities: [{
    maxInstances: 1,
    browserName: 'chrome'
  }],
  sync: true,
  logLevel: 'error',
  coloredLogs: true,
  deprecationWarnings: true,
  bail: 0,
  screenshotPath: './test/ws/error-shots/',
  baseUrl: 'http://localhost:12345/',
  waitforTimeout: 100000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,
  services: ['chromedriver'],
  framework: 'mocha',
  port: '9515',
  path: '/',
  mochaOpts: {
    ui: 'bdd'
  },
  beforeSession: function (config, capabilities, specs) {
    ptEcho.listen(PORT_NET)
    tlsEcho.listen(PORT_TLS)
    server.listen(12345)
  },
  before: function (capabilities, specs) {
    var chai = require('chai')
    global.expect = chai.expect
  },
  after: function (result, capabilities, specs) {
  },
  afterSession: function (config, capabilities, specs) {
    ptEcho.close()
    tlsEcho.close()
    server.close()
  }
}
