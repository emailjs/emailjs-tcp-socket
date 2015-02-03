'use strict';

define(function(require) {

    var expect = require('chai').expect,
        TcpSocket = require('tcp-socket');

    describe('TcpSocket websocket unit tests', function() {
        var socket;

        window.Windows = {
            Networking: {
                HostName: function(hostname) {
                    this.type = hostname;
                    this.hostname = hostname;
                },
                Sockets: {
                    StreamSocket: function() {
                        var self = this;
                        this.control = {};

                        this.inputStream = {
                            type: 'inputStream'
                        };

                        this.outputStream = {
                            type: 'outputStream'
                        };

                        this.connectAsync = function(host, port, protection) {
                            self.host = host;
                            self.port = port;
                            self.protection = protection;
                            return {
                                done: function(successCb) {
                                    setImmediate(function() {
                                        successCb();
                                    });
                                }
                            };
                        };
                    },
                    SocketProtectionLevel: {
                        plainSocket: 1,
                        tls12: 2
                    }
                }
            },
            Storage: {
                Streams: {
                    DataReader: function(stream) {
                        var self = this;

                        this.type = 'DataReader';
                        this.stream = stream;
                        this.inputStreamOptions = false;

                        this._bytes = false;

                        this.loadAsync = function(/* bytes */) {
                            return {
                                done: function(successCb) {
                                    setImmediate(function() {
                                        successCb(self._bytes && self._bytes.length || 0);
                                    });
                                }
                            };
                        };

                        this.readBytes = function(target) {
                            for (var i = 0, len = self._bytes.length; i < len; i++) {
                                target[i] = self._bytes[i];
                            }
                            self._bytes = false;
                        };
                    },
                    DataWriter: function(stream) {
                        var self = this;

                        this.type = 'DataWriter';
                        this.stream = stream;
                        this.inputStreamOptions = false;

                        this._bytes = false;

                        this.writeBytes = function(data) {
                            self._bytes = data;
                        };

                        this.storeAsync = function() {
                            return {
                                done: function(successCb) {
                                    setImmediate(function() {
                                        successCb();
                                    });
                                }
                            };
                        };
                    },
                    InputStreamOptions: {
                        partial: 3
                    }
                }
            }
        };

        beforeEach(function(done) {
            socket = TcpSocket.open('127.0.0.1', 9000, {
                useSecureTransport: false
            });
            expect(socket).to.exist;

            socket.onopen = function() {
                done();
            };
        });

        describe('open and read', function() {
            it('should read data from socket', function(done) {
                socket.ondata = function(e) {
                    expect(new Uint8Array(e.data)).to.deep.equal(new Uint8Array([0, 1, 2]));
                    done();
                };

                socket._dataReader._bytes = new Uint8Array([0, 1, 2]);
            });
        });

        describe('close', function() {
            it('should work', function(done) {
                socket.onclose = function() {
                    expect(socket.readyState).to.equal('closed');
                    done();
                };

                socket.close();
            });
        });

        describe('send', function() {
            it('should send data to socket', function(done) {
                socket.ondrain = function() {
                    done();
                };

                socket.send(new Uint8Array([0, 1, 2]).buffer);
            });
        });
    });
});