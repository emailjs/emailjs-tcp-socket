import {
  EVENT_HANDSHAKE,
  EVENT_INBOUND, EVENT_OUTBOUND,
  EVENT_OPEN, EVENT_CLOSE,
  EVENT_CONFIG, EVENT_CERT,
  EVENT_ERROR,
  createMessage
} from './worker-utils'
import TLS from './tls'

var tls = new TLS()
tls.tlserror = message => self.postMessage(createMessage(EVENT_ERROR, message))
tls.tlscert = cert => self.postMessage(createMessage(EVENT_CERT, cert))
tls.tlsclose = () => self.postMessage(createMessage(EVENT_CLOSE))
tls.tlsopen = () => self.postMessage(createMessage(EVENT_OPEN))
tls.tlsoutbound = buffer => self.postMessage(createMessage(EVENT_OUTBOUND, buffer), [buffer])
tls.tlsinbound = buffer => self.postMessage(createMessage(EVENT_INBOUND, buffer), [buffer])

self.onmessage = function ({ data: { event, message } }) {
  switch (event) {
    case EVENT_INBOUND:
      tls.processInbound(message)
      break
    case EVENT_OUTBOUND:
      tls.prepareOutbound(message)
      break
    case EVENT_HANDSHAKE:
      tls.handshake()
      break
    case EVENT_CONFIG:
      tls.configure(message)
      break
  }
}
