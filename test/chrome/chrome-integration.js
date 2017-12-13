import TCPSocket from '../../'
import { PORT_NET, PORT_STARTTLS, PORT_TLS } from '../constants'
const { expect } = window.chai

const a2s = arr => String.fromCharCode.apply(null, new Uint8Array(arr))
const s2a = str => new Uint8Array(str.split('').map(char => char.charCodeAt(0))).buffer

describe('TCP chrome shim integration tests', function () {
  const payload = 'the.payload.woopwoop!'
  let received

  beforeEach(done => {
    received = ''
    setTimeout(done, 500)
  })

  describe('tcp', function () {
    it('should open, read, write, and close', function (done) {
      const socket = TCPSocket.open('localhost', PORT_NET)
      socket.onopen = () => { socket.send(s2a(payload)) }
      socket.onclose = () => {
        expect(received).to.equal(payload)
        done()
      }
      socket.ondata = ({ data }) => {
        received += a2s(data)
        if (received === payload) {
          socket.close()
        }
      }
    })
  })

  describe('tls', function () {
    it('should open, read, write, and close', function (done) {
      const useSecureTransport = true
      var socket = TCPSocket.open('localhost', PORT_TLS, { useSecureTransport })
      socket.onopen = () => { socket.send(s2a(payload)) }
      socket.onclose = () => {
        expect(received).to.equal(payload)
        done()
      }
      socket.ondata = ({ data }) => {
        received += a2s(data)
        if (received === payload) {
          socket.close()
        }
      }
    })
  })

  describe.skip('starttls', function () {
    it('should open, read, write, and close', function (done) {
      var socket = TCPSocket.open('localhost', PORT_STARTTLS)
      socket.onopen = () => {
        socket.upgradeToSecure()
        socket.send(s2a(payload))
      }
      socket.onclose = () => {
        expect(received).to.equal(payload)
        done()
      }
      socket.ondata = ({ data }) => {
        received += a2s(data)
        if (received === payload) {
          socket.close()
        }
      }
    })
  })
})
