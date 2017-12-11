import { pathOr, propOr } from 'ramda'
import createTls from './tls-utils'
import {
  EVENT_INBOUND, EVENT_OUTBOUND,
  createMessage
} from './worker-utils'

export default class TCPSocket {
  static open (host, port, options = {}) {
    return new TCPSocket({ host, port, options })
  }

  constructor ({ host, port, options }) {
    this.host = host
    this.port = port
    this.ssl = false
    this.bufferedAmount = 0
    this.readyState = 'connecting'
    this.binaryType = propOr('arraybuffer', 'binaryType')(options)

    if (this.binaryType !== 'arraybuffer') {
      throw new Error('Only arraybuffers are supported!')
    }

    this._ca = options.ca
    this._useTLS = propOr(false, 'useSecureTransport')(options)
    this._useSTARTTLS = false

    this._wsHost = pathOr(window.location.origin, ['ws', 'url'])(options)
    this._wsOptions = pathOr({}, ['ws', 'options'])(options)
    this._wsOptions.reconnection = this._wsOptions.reconnection || false
    this._wsOptions.multiplex = this._wsOptions.multiplex || false

    this._socket = io(this._wsHost, this._wsOptions)
    this._socket.emit('open', { host, port }, proxyHostname => {
      this._proxyHostname = proxyHostname
      if (this._useTLS) {
        // the socket is up, do the tls handshake
        createTls(this)
      } else {
        // socket is up and running
        this._emit('open', {
          proxyHostname: this._proxyHostname
        })
      }

      this._socket.on('data', buffer => {
        if (this._useTLS || this._useSTARTTLS) {
          // feed the data to the tls socket
          if (this._tlsWorker) {
            this._tlsWorker.postMessage(createMessage(EVENT_INBOUND, buffer), [buffer])
          } else {
            this._tls.processInbound(buffer)
          }
        } else {
          this._emit('data', buffer)
        }
      })

      this._socket.on('error', message => {
        this._emit('error', new Error(message))
        this.close()
      })

      this._socket.on('close', () => this.close())
    })
  }

  close () {
    this.readyState = 'closing'

    this._socket.emit('end')
    this._socket.disconnect()

    if (this._tlsWorker) {
      this._tlsWorker.terminate()
    }

    this._emit('close')
  }

  send (buffer) {
    if (this._useTLS || this._useSTARTTLS) {
      // give buffer to forge to be prepared for tls
      if (this._tlsWorker) {
        this._tlsWorker.postMessage(createMessage(EVENT_OUTBOUND, buffer), [buffer])
      } else {
        this._tls.prepareOutbound(buffer)
      }
      return
    }

    this._send(buffer)
  }

  _send (data) {
    this._socket.emit('data', data, () => this._emit('drain'))
  }

  upgradeToSecure () {
    if (this.ssl || this._useSTARTTLS) return

    this._useSTARTTLS = true
    createTls(this)
  }

  _emit (type, data) {
    const target = this
    switch (type) {
      case 'open':
        this.readyState = 'open'
        this.onopen && this.onopen({ target, type, data })
        break
      case 'error':
        this.onerror && this.onerror({ target, type, data })
        break
      case 'data':
        this.ondata && this.ondata({ target, type, data })
        break
      case 'drain':
        this.ondrain && this.ondrain({ target, type, data })
        break
      case 'close':
        this.readyState = 'closed'
        this.onclose && this.onclose({ target, type, data })
        break
    }
  }
}
