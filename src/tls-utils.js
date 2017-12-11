import {
  EVENT_HANDSHAKE,
  EVENT_INBOUND, EVENT_OUTBOUND,
  EVENT_OPEN, EVENT_CLOSE,
  EVENT_CONFIG, EVENT_CERT,
  EVENT_ERROR,
  createMessage
} from './worker-utils'
import TLS from './tls'
import TlsWorkerBlob from '../res/tls.worker.blob'

export default function createTls (socket) {
  socket.tlscert = cert => { socket.oncert(cert) }
  socket.tlsclose = () => { socket.close() }
  socket.tlsoutbound = buffer => { socket._send(buffer) }
  socket.tlsinbound = buffer => { socket._emit('data', buffer) }
  socket.tlserror = function (message) {
    socket._emit('error', new Error(message))
    socket.close()
  }
  socket.tlsopen = function () {
    socket.ssl = true
    if (socket._useTLS) {
      if (socket._proxyHostname) {
        socket._emit('open', {
          proxyHostname: socket._proxyHostname
        })
      } else {
        socket._emit('open')
      }
    }
  }

  if (window.Worker) {
    createTlsWithWorker(socket)
  } else {
    createTlsNoWorker(socket)
  }
}

var createTlsNoWorker = function (socket) {
  socket._tls = new TLS()
  socket._tls.tlserror = socket.tlserror
  socket._tls.tlscert = socket.tlscert
  socket._tls.tlsclose = socket.tlsclose
  socket._tls.tlsopen = socket.tlsopen
  socket._tls.tlsoutbound = socket.tlsoutbound
  socket._tls.tlsinbound = socket.tlsinbound

  // configure the tls client
  socket._tls.configure({
    host: socket.host,
    ca: socket._ca
  })

  // start the handshake
  socket._tls.handshake()
}

var createTlsWithWorker = function (socket) {
  socket._tlsWorker = new Worker(URL.createObjectURL(new Blob([TlsWorkerBlob])))
  socket._tlsWorker.onerror = ({message}) => socket.tlserror(message)
  socket._tlsWorker.onmessage = function ({data: {event, message}}) {
    switch (event) {
      case EVENT_CERT:
        socket.tlscert(message)
        break
      case EVENT_ERROR:
        socket.tlserror(message)
        break
      case EVENT_CLOSE:
        socket.tlsclose(message)
        break
      case EVENT_OPEN:
        socket.tlsopen(message)
        break
      case EVENT_OUTBOUND:
        socket.tlsoutbound(message)
        break
      case EVENT_INBOUND:
        socket.tlsinbound(message)
        break
    }
  }

  socket._tlsWorker.postMessage(createMessage(EVENT_CONFIG, { host: socket.host, ca: socket._ca }))
  socket._tlsWorker.postMessage(createMessage(EVENT_HANDSHAKE))
}
