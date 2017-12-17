import { propOr } from 'ramda'

export default class TCPSocket {
  static open (host, port, options = {}) {
    return new TCPSocket({ host, port, options })
  }

  constructor ({ host, port, options }) {
    this.host = new Windows.Networking.HostName(host) // NB! HostName constructor will throw on invalid input
    this.port = port
    this.ssl = propOr(false, 'useSecureTransport')(options)
    this.bufferedAmount = 0
    this.readyState = 'connecting'
    this.binaryType = propOr('arraybuffer', 'binaryType')(options)

    if (this.binaryType !== 'arraybuffer') {
      throw new Error('Only arraybuffers are supported!')
    }

    this._socket = new Windows.Networking.Sockets.StreamSocket()

    this._socket.control.keepAlive = true
    this._socket.control.noDelay = true

    this._dataReader = null
    this._dataWriter = null

    // set to true if upgrading with STARTTLS
    this._upgrading = false

    // cache all client.send calls to this array if currently upgrading
    this._upgradeCache = []

    // initial socket type. default is 'plainSocket' (no encryption applied)
    // 'tls12' supports the TLS 1.2, TLS 1.1 and TLS 1.0 protocols but no SSL
    this._protectionLevel = Windows.Networking.Sockets.SocketProtectionLevel[this.ssl ? 'tls12' : 'plainSocket']

    // Initiate connection to destination
    this._socket
      .connectAsync(this.host, this.port, this._protectionLevel)
      .done(() => {
        this._setStreamHandlers()
        this._emit('open')
      }, e => this._emit('error', e))
  }

  /**
   * Initiate Reader and Writer interfaces for the socket
   */
  _setStreamHandlers () {
    this._dataReader = new Windows.Storage.Streams.DataReader(this._socket.inputStream)
    this._dataReader.inputStreamOptions = Windows.Storage.Streams.InputStreamOptions.partial

    // setup writer
    this._dataWriter = new Windows.Storage.Streams.DataWriter(this._socket.outputStream)

    // start byte reader loop
    this._read()
  }

  /**
   * Emit an error and close socket
   *
   * @param {Error} error Error object
   */
  _errorHandler (error) {
    // we ignore errors after close has been called, since all aborted operations
    // will emit their error handlers
    // this will also apply to starttls as a read call is aborted before upgrading the socket
    if (this._upgrading || (this.readyState !== 'closing' && this.readyState !== 'closed')) {
      this._emit('error', error)
      this.close()
    }
  }

  /**
   * Read available bytes from the socket. This method is recursive  once it ends, it restarts itthis
   */
  _read () {
    if (this._upgrading || (this.readyState !== 'open' && this.readyState !== 'connecting')) {
      return // do nothing if socket not open
    }

    // Read up to 4096 bytes from the socket. This is not a fixed number (the mode was set
    // with inputStreamOptions.partial property), so it might return with a smaller
    // amount of bytes.
    this._dataReader.loadAsync(4096).done(availableByteCount => {
      if (!availableByteCount) {
        // no bytes available for reading, restart the reading process
        return setImmediate(this._read.bind(this))
      }

      // we need an Uint8Array that gets filled with the bytes from the buffer
      var data = new Uint8Array(availableByteCount)
      this._dataReader.readBytes(data) // data argument gets filled with the bytes

      this._emit('data', data.buffer)

      // restart reading process
      return setImmediate(this._read.bind(this))
    }, e => this._errorHandler(e))
  }

  //
  // API
  //

  close () {
    this.readyState = 'closing'

    try {
      this._socket.close()
    } catch (E) {
      this._emit('error', E)
    }

    setImmediate(this._emit.bind(this, 'close'))
  }

  send (data) {
    if (this.readyState !== 'open') {
      return
    }

    if (this._upgrading) {
      this._upgradeCache.push(data)
      return
    }

    // Write bytes to buffer
    this._dataWriter.writeBytes(data)

    // Emit buffer contents
    this._dataWriter.storeAsync().done(() => this._emit('drain'), (e) => this._errorHandler(e))
  }

  upgradeToSecure () {
    if (this.ssl || this._upgrading) return

    this._upgrading = true
    try {
      // release current input stream. this is required to allow socket upgrade
      // write stream is not released as all send calls are cached from this point onwards
      // and not passed to socket until the socket is upgraded
      this._dataReader.detachStream()
    } catch (E) { }

    // update protection level
    this._protectionLevel = Windows.Networking.Sockets.SocketProtectionLevel.tls12

    this._socket.upgradeToSslAsync(this._protectionLevel, this.host).done(
      () => {
        this._upgrading = false
        this.ssl = true // secured connection from now on

        this._dataReader = new Windows.Storage.Streams.DataReader(this._socket.inputStream)
        this._dataReader.inputStreamOptions = Windows.Storage.Streams.InputStreamOptions.partial
        this._read()

        // emit all cached requests
        while (this._upgradeCache.length) {
          const data = this._upgradeCache.shift()
          this.send(data)
        }
      },
      (e) => {
        this._upgrading = false
        this._errorHandler(e)
      }
    )
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
