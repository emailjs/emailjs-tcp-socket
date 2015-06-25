'use strict';

define(function(require) {

    var expect = require('chai').expect,
        sinon = require('sinon'),
        TcpSocket = require('tcp-socket');

    describe('TcpSocket chrome unit tests', function() {
        var socket, socketStub,
            testData = new Uint8Array([0, 1, 2]);

        describe('chrome.socket', function() {
            beforeEach(function() {
                // create chrome.socket stub
                var ChromeLegacySocket = function() {};
                ChromeLegacySocket.prototype.create = function() {};
                ChromeLegacySocket.prototype.connect = function() {};
                ChromeLegacySocket.prototype.read = function() {};
                ChromeLegacySocket.prototype.disconnect = function() {};
                ChromeLegacySocket.prototype.destroy = function() {};
                ChromeLegacySocket.prototype.write = function() {};
                ChromeLegacySocket.prototype.secure = function() {};

                window.chrome.socket = socketStub = sinon.createStubInstance(ChromeLegacySocket);
                window.chrome.sockets = undefined;
                window.chrome.runtime = {
                    getPlatformInfo: function(cb) {
                        cb({
                            os: 'mac'
                        });
                    }
                };

                socketStub.create.withArgs('tcp').yields({
                    socketId: 42
                });
                socketStub.connect.withArgs(42, '127.0.0.1', 9000).yieldsAsync(0);
                socketStub.secure.withArgs(42).yieldsAsync(0);
                socketStub.read.withArgs(42).yieldsAsync({
                    resultCode: 1,
                    data: testData.buffer
                });
                socketStub.write.withArgs(42).yieldsAsync({
                    bytesWritten: 3
                });
            });

            it('should open, read, write, close without ssl', function(done) {
                var sent = false;

                socket = TcpSocket.open('127.0.0.1', 9000, {
                    useSecureTransport: false
                });

                socket.onopen = function() {
                    expect(socket._socketId).to.equal(42);
                    expect(socket.ssl).to.be.false;
                };

                socket.ondata = function(e) {
                    var buf = new Uint8Array(e.data);
                    expect(buf).to.deep.equal(testData);

                    if (!sent) {
                        sent = !sent;
                        socket.send(new Uint8Array([0, 1, 2]).buffer);
                    }
                };

                socket.ondrain = function() {
                    socket.close();
                };

                socket.onclose = function() {
                    expect(socket.readyState).to.equal('closed');
                    expect(socket._socketId).to.equal(0);
                    expect(socketStub.create.calledOnce).to.be.true;
                    expect(socketStub.connect.calledOnce).to.be.true;
                    expect(socketStub.secure.called).to.be.false;
                    expect(socketStub.read.called).to.be.true;
                    expect(socketStub.disconnect.calledOnce).to.be.true;
                    expect(socketStub.destroy.calledOnce).to.be.true;

                    done();
                };
            });

            it('should open, read, write, close with ssl', function(done) {
                var sent = false;

                socket = TcpSocket.open('127.0.0.1', 9000, {
                    useSecureTransport: true
                });

                socket.onopen = function() {
                    expect(socket._socketId).to.equal(42);
                    expect(socket.ssl).to.be.true;
                };

                socket.ondata = function(e) {
                    var buf = new Uint8Array(e.data);
                    expect(buf).to.deep.equal(testData);

                    if (!sent) {
                        sent = !sent;
                        socket.send(new Uint8Array([0, 1, 2]).buffer);
                    }
                };

                socket.ondrain = function() {
                    socket.close();
                };

                socket.onclose = function() {
                    expect(socket.readyState).to.equal('closed');
                    expect(socket._socketId).to.equal(0);
                    expect(socketStub.create.calledOnce).to.be.true;
                    expect(socketStub.connect.calledOnce).to.be.true;
                    expect(socketStub.secure.calledOnce).to.be.true;
                    expect(socketStub.read.called).to.be.true;
                    expect(socketStub.write.called).to.be.true;
                    expect(socketStub.disconnect.calledOnce).to.be.true;
                    expect(socketStub.destroy.calledOnce).to.be.true;

                    done();
                };
            });
        });

        describe('chrome.sockets', function() {
            beforeEach(function() {
                // create chrome.socket stub
                var ChromeSocket = function() {};
                ChromeSocket.prototype.create = function() {};
                ChromeSocket.prototype.connect = function() {};
                ChromeSocket.prototype.disconnect = function() {};
                ChromeSocket.prototype.send = function() {};
                ChromeSocket.prototype.secure = function() {};
                ChromeSocket.prototype.setPaused = function() {};

                window.chrome.socket = undefined;
                socketStub = sinon.createStubInstance(ChromeSocket);
                window.chrome.sockets = {
                    tcp: socketStub
                };

                window.chrome.runtime = {
                    getPlatformInfo: function(cb) {
                        cb({
                            os: 'cordova'
                        });
                    }
                };

                socketStub.onReceive = {
                    addListener: function(cb) {
                        setTimeout(function() {
                            cb({
                                socketId: 42,
                                data: testData.buffer
                            });
                        }, 50);
                    }
                };

                socketStub.onReceiveError = {
                    addListener: function() {}
                };

                socketStub.create.yields({
                    socketId: 42
                });
                socketStub.connect.withArgs(42, '127.0.0.1', 9000).yieldsAsync(0);
                socketStub.secure.withArgs(42).yieldsAsync(0);
                socketStub.setPaused.withArgs(42, true).yieldsAsync();
                socketStub.setPaused.withArgs(42, false).yieldsAsync();
                socketStub.send.withArgs(42).yieldsAsync({
                    bytesWritten: 3
                });
            });

            it('should open, read, write, close without ssl', function(done) {
                var sent = false;

                socket = TcpSocket.open('127.0.0.1', 9000, {
                    useSecureTransport: false
                });

                socket.onopen = function() {
                    expect(socket._socketId).to.equal(42);
                    expect(socket.ssl).to.be.false;
                };

                socket.ondata = function(e) {
                    var buf = new Uint8Array(e.data);
                    expect(buf).to.deep.equal(testData);

                    if (!sent) {
                        sent = !sent;
                        socket.send(new Uint8Array([0, 1, 2]).buffer);
                    }
                };

                socket.ondrain = function() {
                    socket.close();
                };

                socket.onclose = function() {
                    expect(socket.readyState).to.equal('closed');
                    expect(socket._socketId).to.equal(0);
                    expect(socketStub.create.calledOnce).to.be.true;
                    expect(socketStub.connect.calledOnce).to.be.true;
                    expect(socketStub.secure.called).to.be.false;
                    expect(socketStub.send.calledOnce).to.be.true;
                    expect(socketStub.disconnect.calledOnce).to.be.true;
                    expect(socketStub.setPaused.calledTwice).to.be.true;

                    done();
                };
            });

            it('should open, read, write, close with ssl', function(done) {
                var sent = false;

                socket = TcpSocket.open('127.0.0.1', 9000, {
                    useSecureTransport: true
                });

                socket.onopen = function() {
                    expect(socket._socketId).to.equal(42);
                    expect(socket.ssl).to.be.true;
                };

                socket.ondata = function(e) {
                    var buf = new Uint8Array(e.data);
                    expect(buf).to.deep.equal(testData);

                    if (!sent) {
                        sent = !sent;
                        socket.send(new Uint8Array([0, 1, 2]).buffer);
                    }
                };

                socket.ondrain = function() {
                    socket.close();
                };

                socket.onclose = function() {
                    expect(socket.readyState).to.equal('closed');
                    expect(socket._socketId).to.equal(0);
                    expect(socketStub.create.calledOnce).to.be.true;
                    expect(socketStub.connect.calledOnce).to.be.true;
                    expect(socketStub.secure.calledOnce).to.be.true;
                    expect(socketStub.send.calledOnce).to.be.true;
                    expect(socketStub.disconnect.calledOnce).to.be.true;
                    expect(socketStub.setPaused.calledTwice).to.be.true;

                    done();
                };
            });
        });
    });
});