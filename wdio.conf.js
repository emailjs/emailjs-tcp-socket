const attachProxy = require('emailjs-tcp-proxy').default
const express = require('express')
const { Server } = require('http')
const path = require('path')
const net = require('net')

const echo = net.createServer(socket => socket.pipe(socket))
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
    browserName: 'chrome',
    chromeOptions: {
      args: ['headless', 'disable-gpu']
    }
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
    echo.listen(8888, () => {
      server.listen(12345)
    })
  },
  before: function (capabilities, specs) {
    var chai = require('chai')
    global.expect = chai.expect
  },
  after: function (result, capabilities, specs) {
  },
  afterSession: function (config, capabilities, specs) {
    echo.close(() => {
      server.close()
    })
  }
}
