/* eslint-disable no-unused-expressions */

import TcpSocket from './windows-socket'

describe('TCPSocket Windows Stream Socket unit tests', function () {
  var socket

  before(() => {
    global.Windows = {
      Networking: {
        HostName: function (hostname) {
          this.type = hostname
          this.hostname = hostname
        },
        Sockets: {
          StreamSocket: function () {
            this.control = {}

            this.inputStream = {
              type: 'inputStream'
            }

            this.outputStream = {
              type: 'outputStream'
            }

            this.connectAsync = (host, port, protection) => {
              this.host = host
              this.port = port
              this.protection = protection
              return {
                done: successCb => setImmediate(successCb)
              }
            }
          },
          SocketProtectionLevel: {
            plainSocket: 1,
            tls12: 2
          }
        }
      },
      Storage: {
        Streams: {
          DataReader: function (stream) {
            this.type = 'DataReader'
            this.stream = stream
            this.inputStreamOptions = false

            this._bytes = false

            this.loadAsync = () => ({
              done: successCb => setImmediate(() => successCb((this._bytes && this._bytes.length) || 0))
            })

            this.readBytes = target => {
              for (let i = 0, len = this._bytes.length; i < len; i++) {
                target[i] = this._bytes[i]
              }
              this._bytes = false
            }
          },
          DataWriter: function (stream) {
            this.type = 'DataWriter'
            this.stream = stream
            this.inputStreamOptions = false

            this._bytes = false

            this.writeBytes = data => { this._bytes = data }

            this.storeAsync = () => ({
              done: successCb => setImmediate(successCb)
            })
          },
          InputStreamOptions: {
            partial: 3
          }
        }
      }
    }
  })

  beforeEach(function (done) {
    socket = TcpSocket.open('127.0.0.1', 9000, {
      useSecureTransport: false
    })
    expect(socket).to.exist

    socket.onopen = function () {
      done()
    }
  })

  describe('open and read', function () {
    it('should read data from socket', function (done) {
      socket.ondata = function (e) {
        expect(new Uint8Array(e.data)).to.deep.equal(new Uint8Array([0, 1, 2]))
        socket.close()
      }
      socket.onclose = () => done()

      socket._dataReader._bytes = new Uint8Array([0, 1, 2])
    })
  })

  describe('close', function () {
    it('should work', function (done) {
      socket.onclose = function () {
        expect(socket.readyState).to.equal('closed')
        done()
      }

      socket.close()
    })
  })

  describe('send', function () {
    it('should send data to socket', function (done) {
      socket.ondrain = function () {
        socket.close()
      }
      socket.onclose = () => done()

      socket.send(new Uint8Array([0, 1, 2]).buffer)
    })
  })
})
