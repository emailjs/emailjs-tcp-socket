import { propOr } from 'ramda'
import scheduleInNextEventLoop from './timeout'
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
    this._socketId = 0
    this._useLegacySocket = false
    this._useForgeTls = false

    // handles writes during starttls handshake, chrome socket only
    this._startTlsBuffer = []
    this._startTlsHandshakeInProgress = false

    chrome.runtime.getPlatformInfo(platformInfo => {
      if (platformInfo.os.indexOf('cordova') !== -1) {
        // chrome.sockets.tcp.secure is not functional on cordova
        // https://github.com/MobileChromeApps/mobile-chrome-apps/issues/269
        this._useLegacySocket = false
        this._useForgeTls = true
      } else {
        this._useLegacySocket = true
        this._useForgeTls = false
      }

      if (this._useLegacySocket) {
        this._createLegacySocket()
      } else {
        this._createSocket()
      }
    })
  }

  /**
   * Creates a socket using the deprecated chrome.socket API
   */
  _createLegacySocket () {
    chrome.socket.create('tcp', {}, createInfo => {
      this._socketId = createInfo.socketId

      chrome.socket.connect(this._socketId, this.host, this.port, result => {
        if (result !== 0) {
          this.readyState = 'closed'
          this._emit('error', chrome.runtime.lastError)
          return
        }

        this._onSocketConnected()
      })
    })
  }

  /**
   * Creates a socket using chrome.sockets.tcp
   */
  _createSocket () {
    chrome.sockets.tcp.create({}, createInfo => {
      this._socketId = createInfo.socketId

      // register for data events on the socket before connecting
      chrome.sockets.tcp.onReceive.addListener(readInfo => {
        if (readInfo.socketId === this._socketId) {
          // process the data available on the socket
          this._onData(readInfo.data)
        }
      })

      // register for data error on the socket before connecting
      chrome.sockets.tcp.onReceiveError.addListener(readInfo => {
        if (readInfo.socketId === this._socketId) {
          // socket closed remotely or broken
          this.close()
        }
      })

      chrome.sockets.tcp.setPaused(this._socketId, true, () => {
        chrome.sockets.tcp.connect(this._socketId, this.host, this.port, result => {
          if (result < 0) {
            this.readyState = 'closed'
            this._emit('error', chrome.runtime.lastError)
            return
          }

          this._onSocketConnected()
        })
      })
    })
  }

  /**
   * Invoked once a socket has been connected:
   * - Kicks off TLS handshake, if necessary
   * - Starts reading from legacy socket, if necessary
   */
  _onSocketConnected () {
    const read = () => {
      if (this._useLegacySocket) {
        // the tls handshake is done let's start reading from the legacy socket
        this._readLegacySocket()
        this._emit('open')
      } else {
        chrome.sockets.tcp.setPaused(this._socketId, false, () => {
          this._emit('open')
        })
      }
    }

    if (!this._useTLS) {
      return read()
    }

    // do an immediate TLS handshake if this._useTLS === true
    this._upgradeToSecure(() => { read() })
  }

  /**
   * Handles the rough edges for differences between chrome.socket and chrome.sockets.tcp
   * for upgrading to a TLS connection with or without forge
   */
  _upgradeToSecure (callback = () => {}) {
    // invoked after chrome.socket.secure or chrome.sockets.tcp.secure have been upgraded
    const onUpgraded = tlsResult => {
      if (tlsResult !== 0) {
        this._emit('error', new Error('TLS handshake failed. Reason: ' + chrome.runtime.lastError.message))
        this.close()
        return
      }

      this.ssl = true

      // empty the buffer
      while (this._startTlsBuffer.length) {
        this.send(this._startTlsBuffer.shift())
      }

      callback()
    }

    if (!this._useLegacySocket && this.readyState !== 'open') {
      // use chrome.sockets.tcp.secure for TLS, not for STARTTLS!
      // use forge only for STARTTLS
      this._useForgeTls = false
      chrome.sockets.tcp.secure(this._socketId, onUpgraded)
    } else if (this._useLegacySocket) {
      chrome.socket.secure(this._socketId, onUpgraded)
    } else if (this._useForgeTls) {
      // setup the forge tls client or webworker as tls fallback
      createTls(this)
      callback()
    }
  }

  upgradeToSecure () {
    if (this.ssl || this._useSTARTTLS) {
      return
    }

    this._useSTARTTLS = true
    this._upgradeToSecure(() => {
      if (this._useLegacySocket) {
        this._readLegacySocket() // tls handshake is done, restart reading
      }
    })
  }

  /**
   * Reads from a legacy chrome.socket.
   */
  _readLegacySocket () {
    if (this._socketId === 0) {
      // the socket is closed. omit read and stop further reads
      return
    }

    // don't read from chrome.socket if we have chrome.socket.secure a handshake in progress!
    if ((this._useSTARTTLS || this._useTLS) && !this.ssl) {
      return
    }

    chrome.socket.read(this._socketId, readInfo => {
      // socket closed remotely or broken
      if (readInfo.resultCode <= 0) {
        this._socketId = 0
        this.close()
        return
      }

      // process the data available on the socket
      this._onData(readInfo.data)

      // Queue the next read.
      // If a STARTTLS handshake might be upcoming, postpone this onto
      // the task queue so the IMAP client has a chance to call upgradeToSecure;
      // without this, we might eat the beginning of the handshake.
      // If we are already secure, just call it (for performance).
      if (this.ssl) {
        this._readLegacySocket()
      } else {
        scheduleInNextEventLoop(() => this._readLegacySocket())
      }
    })
  }

  /**
   * Invoked when data has been read from the socket. Handles cases when to feed
   * the data available on the socket to forge.
   *
   * @param {ArrayBuffer} buffer The binary data read from the socket
   */
  _onData (buffer) {
    if ((this._useTLS || this._useSTARTTLS) && this._useForgeTls) {
      // feed the data to the tls client
      if (this._tlsWorker) {
        this._tlsWorker.postMessage(createMessage(EVENT_INBOUND, buffer), [buffer])
      } else {
        this._tls.processInbound(buffer)
      }
    } else {
      // emit data event
      this._emit('data', buffer)
    }
  }

  /**
   * Closes the socket
   * @return {[type]} [description]
   */
  close () {
    this.readyState = 'closing'

    if (this._socketId !== 0) {
      if (this._useLegacySocket) {
        // close legacy socket
        chrome.socket.disconnect(this._socketId)
        chrome.socket.destroy(this._socketId)
      } else {
        // close socket
        chrome.sockets.tcp.disconnect(this._socketId)
      }

      this._socketId = 0
    }

    // terminate the tls worker
    if (this._tlsWorker) {
      this._tlsWorker.terminate()
      this._tlsWorker = undefined
    }

    this._emit('close')
  }

  send (buffer) {
    if (!this._useForgeTls && this._useSTARTTLS && !this.ssl) {
      // buffer the unprepared data until chrome.socket(s.tcp) handshake is done
      this._startTlsBuffer.push(buffer)
    } else if (this._useForgeTls && (this._useTLS || this._useSTARTTLS)) {
      // give buffer to forge to be prepared for tls
      if (this._tlsWorker) {
        this._tlsWorker.postMessage(createMessage(EVENT_OUTBOUND, buffer), [buffer])
      } else {
        this._tls.prepareOutbound(buffer)
      }
    } else {
      // send the arraybuffer
      this._send(buffer)
    }
  }

  _send (data) {
    if (this._socketId === 0) {
      // the socket is closed.
      return
    }

    if (this._useLegacySocket) {
      chrome.socket.write(this._socketId, data, writeInfo => {
        if (writeInfo.bytesWritten < 0 && this._socketId !== 0) {
          // if the socket is already 0, it has already been closed. no need to alert then...
          this._emit('error', new Error('Could not write ' + data.byteLength + ' bytes to socket ' + this._socketId + '. Chrome error code: ' + writeInfo.bytesWritten))
          this._socketId = 0
          this.close()

          return
        }

        this._emit('drain')
      })
    } else {
      chrome.sockets.tcp.send(this._socketId, data, sendInfo => {
        if (sendInfo.bytesSent < 0 && this._socketId !== 0) {
          // if the socket is already 0, it has already been closed. no need to alert then...
          this._emit('error', new Error('Could not write ' + data.byteLength + ' bytes to socket ' + this._socketId + '. Chrome error code: ' + sendInfo.bytesSent))
          this.close()

          return
        }

        this._emit('drain')
      })
    }
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
