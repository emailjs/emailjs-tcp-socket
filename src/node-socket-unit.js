/* eslint-disable no-unused-expressions */

import TCPSocket from './node-socket'

describe('TCPSocket Node.js socket unit tests', function () {
  var socket, nodeSocketStub

  beforeEach(function () {
    socket = TCPSocket.open('127.0.0.1', 9000, {
      useSecureTransport: false
    })
    expect(socket).to.exist
    expect(socket._socket).to.exist

    var Socket = function () { }
    Socket.prototype.on = function () { }
    Socket.prototype.write = function () { }
    Socket.prototype.end = function () { }

    socket._socket = nodeSocketStub = sinon.createStubInstance(Socket)
  })

  describe('open', function () {
    it('should not explode', function () {
      socket = TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: false
      })
      expect(socket).to.exist
    })
  })

  describe('close', function () {
    it('should not explode', function () {
      nodeSocketStub.end.returns()

      socket.close()
      expect(socket.readyState).to.equal('closing')
    })
  })

  describe('send', function () {
    it('should not explode', function (done) {
      nodeSocketStub.write.yields()

      socket.ondrain = function () {
        done()
      }

      socket.send(new ArrayBuffer())
    })
  })
})
