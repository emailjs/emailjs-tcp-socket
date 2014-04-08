'use strict';

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function(require) {

    var expect = require('chai').expect,
        sinon = require('sinon'),
        TcpSocket = require('../../src/tcp-socket');

    describe('TcpSocket chrome unit tests', function() {
        var socket;

        beforeEach(function() {
            // create chrome.socket stub
            var Socket = function() {};
            Socket.prototype.create = function() {};
            Socket.prototype.connect = function() {};
            Socket.prototype.read = function() {};
            Socket.prototype.disconnect = function() {};
            Socket.prototype.destroy = function() {};
            Socket.prototype.write = function() {};

            window.chrome.socket = sinon.createStubInstance(Socket);
        });

        describe('chromeShim', function() {

            beforeEach(function(done) {
                // open the socket
                window.chrome.socket.create.withArgs('tcp').yields({
                    socketId: 42
                });
                window.chrome.socket.connect.withArgs(42, '127.0.0.1', 9000).yieldsAsync(0);
                window.chrome.socket.read.withArgs(42).yieldsAsync({
                    resultCode: 1,
                    data: new Uint8Array([0, 1, 2]).buffer
                });

                socket = TcpSocket.open('127.0.0.1', 9000, {
                    useSSL: false,
                });
                expect(socket).to.exist;

                socket.onopen = function() {
                    expect(socket._socketId).to.equal(42);
                    done();
                };
            });

            describe('open and read', function() {
                it('work without ssl', function(done) {
                    var testData = new Uint8Array([0, 1, 2]);

                    window.chrome.socket.create.withArgs('tcp').yields({
                        socketId: 42
                    });
                    window.chrome.socket.connect.withArgs(42, '127.0.0.1', 9000).yieldsAsync(0);
                    window.chrome.socket.read.withArgs(42).yieldsAsync({
                        resultCode: 1,
                        data: testData.buffer
                    });

                    socket = TcpSocket.open('127.0.0.1', 9000, {
                        useSSL: false,
                    });
                    expect(socket).to.exist;

                    socket.onopen = function() {
                        expect(socket._socketId).to.equal(42);
                    };

                    socket.ondata = function(e) {
                        var buf = new Uint8Array(e.data);
                        expect(buf).to.deep.equal(testData);
                        window.chrome.socket.read.restore();
                        done();
                    };
                });
            });

            describe('close', function() {
                it('should work', function(done) {
                    socket.onclose = function() {
                        expect(socket.readyState).to.equal('closed');
                        done();
                    };

                    socket.close();
                    expect(window.chrome.socket.disconnect.withArgs(42).callCount).to.equal(1);
                    expect(window.chrome.socket.destroy.withArgs(42).callCount).to.equal(1);
                    expect(socket._socketId).to.equal(0);
                });
            });

            describe('send', function() {
                it('should not explode', function(done) {
                    window.chrome.socket.write.yields({
                        bytesWritten: 64
                    });

                    socket.ondrain = function() {
                        done();
                    };

                    socket.send(new Uint8Array([0, 1, 2]).buffer);
                });
            });

        });
    });
});