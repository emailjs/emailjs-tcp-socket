let TCPSocket

class DummySocket {
  static open () {
    throw new Error('Runtime does not offer raw sockets!')
  }
}

if (typeof process !== 'undefined') {
  TCPSocket = require('./node-socket')
} else if (typeof chrome !== 'undefined' && (chrome.socket || chrome.sockets)) {
  TCPSocket = require('./chrome-socket')
} else if (typeof Windows === 'object' && Windows && Windows.Networking && Windows.Networking.Sockets && Windows.Networking.Sockets.StreamSocket) {
  TCPSocket = require('./windows-socket')
} else if (typeof window === 'object' && typeof io === 'function') {
  TCPSocket = require('./socketio-socket')
} else {
  TCPSocket = DummySocket
}

module.exports = TCPSocket
