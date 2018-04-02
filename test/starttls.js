//
// StartTLS implementation by Haraka
// https://github.com/haraka/Haraka/blob/master/tls_socket.js
//

/* -------------------------------------------------------------------------- */
/* Obtained and modified from http://js.5sh.net/starttls.js on 8/18/2011.     */
/* -------------------------------------------------------------------------- */

const tls = require('tls')
const net = require('net')
const stream = require('stream')

const certsByHost = {}

// provides a common socket for attaching
// and detaching from either main socket, or crypto socket
class PluggableStream extends stream.Stream {
  constructor (socket) {
    super()
    this.readable = this.writable = true
    this._timeout = 0
    this._keepalive = false
    this._writeState = true
    this._pending = []
    this._pendingCallbacks = []
    if (socket) this.attach(socket)
  }

  pause () {
    if (this.targetsocket.pause) {
      this.targetsocket.pause()
      this.readable = false
    }
  }

  resume () {
    if (this.targetsocket.resume) {
      this.readable = true
      this.targetsocket.resume()
    }
  }

  attach (socket) {
    const self = this
    self.targetsocket = socket
    self.targetsocket.on('data', function (data) {
      self.emit('data', data)
    })
    self.targetsocket.on('connect', (a, b) => {
      self.emit('connect', a, b)
    })
    self.targetsocket.on('secureConnection', function (a, b) {
      self.emit('secureConnection', a, b)
      self.emit('secure', a, b)
    })
    self.targetsocket.on('secure', function (a, b) {
      self.emit('secureConnection', a, b)
      self.emit('secure', a, b)
    })
    self.targetsocket.on('end', function () {
      self.writable = self.targetsocket.writable
      self.emit('end')
    })
    self.targetsocket.on('close', function (hadError) {
      self.writable = self.targetsocket.writable
      self.emit('close', hadError)
    })
    self.targetsocket.on('drain', function () {
      self.emit('drain')
    })
    self.targetsocket.once('error', function (exception) {
      self.writable = self.targetsocket.writable
      self.emit('error', exception)
    })
    self.targetsocket.on('timeout', function () {
      self.emit('timeout')
    })
    if (self.targetsocket.remotePort) {
      self.remotePort = self.targetsocket.remotePort
    }
    if (self.targetsocket.remoteAddress) {
      self.remoteAddress = self.targetsocket.remoteAddress
    }
  }

  clean (data) {
    if (this.targetsocket && this.targetsocket.removeAllListeners) {
      this.targetsocket.removeAllListeners('data')
      this.targetsocket.removeAllListeners('secureConnection')
      this.targetsocket.removeAllListeners('secure')
      this.targetsocket.removeAllListeners('end')
      this.targetsocket.removeAllListeners('close')
      this.targetsocket.removeAllListeners('error')
      this.targetsocket.removeAllListeners('drain')
    }
    this.targetsocket = {}
    this.targetsocket.write = function () { }
  }

  write (data, encoding, callback) {
    if (this.targetsocket.write) {
      return this.targetsocket.write(data, encoding, callback)
    }
    return false
  }

  end (data, encoding) {
    if (this.targetsocket.end) {
      return this.targetsocket.end(data, encoding)
    }
  }

  destroySoon () {
    if (this.targetsocket.destroySoon) {
      return this.targetsocket.destroySoon()
    }
  }

  destroy () {
    if (this.targetsocket.destroy) {
      return this.targetsocket.destroy()
    }
  }

  setKeepAlive (bool) {
    this._keepalive = bool
    return this.targetsocket.setKeepAlive(bool)
  }

  setNoDelay (/* true||false */) {
  }

  unref () {
    return this.targetsocket.unref()
  }

  setTimeout (timeout) {
    this._timeout = timeout
    return this.targetsocket.setTimeout(timeout)
  }
}

function pipe (cleartext, socket) {
  cleartext.socket = socket

  const onerror = e => {
  }

  function onclose () {
    socket.removeListener('error', onerror)
    socket.removeListener('close', onclose)
  }

  socket.on('error', onerror)
  socket.on('close', onclose)
}

function createServer (cb) {
  const server = net.createServer(cryptoSocket => {
    const socket = new PluggableStream(cryptoSocket)

    socket.upgrade = cb2 => {
      socket.clean()

      cryptoSocket.removeAllListeners('data')

      const options = Object.assign({}, certsByHost['*'])
      options.server = server // TLSSocket needs server for SNI to work

      const cleartext = new tls.TLSSocket(cryptoSocket, options)

      pipe(cleartext, cryptoSocket)

      cleartext
        .on('error', exception => {
          socket.emit('error', exception)
        })
        .on('secure', () => {
          socket.emit('secure')
          if (cb2) {
            cb2(
              cleartext.authorized,
              cleartext.authorizationError,
              cleartext.getPeerCertificate(),
              cleartext.getCipher()
            )
          }
        })

      socket.cleartext = cleartext

      if (socket._timeout) {
        cleartext.setTimeout(socket._timeout)
      }

      cleartext.setKeepAlive(socket._keepalive)

      socket.attach(socket.cleartext)
    }

    cb(socket)
  })

  return server
}

exports.createServer = createServer
