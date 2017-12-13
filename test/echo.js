const fs = require('fs')
const net = require('net')
const tls = require('tls')
const { join } = require('path')
const startTls = require('./starttls')
const { PORT_NET, PORT_STARTTLS, PORT_TLS } = require('./constants')

module.exports = function createServers () {
  const key = fs.readFileSync(join(__dirname, '..', 'crt', 'server.key'), 'utf8')
  const cert = fs.readFileSync(join(__dirname, '..', 'crt', 'server.crt'), 'utf8')
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
