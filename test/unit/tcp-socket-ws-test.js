'use strict';

define(function(require) {

    var expect = require('chai').expect,
        sinon = require('sinon'),
        TcpSocket = require('../../src/tcp-socket');

    describe('TcpSocket websocket unit tests', function() {
        var stubIo, socket;

        var Io = function() {};
        Io.prototype.on = function() {};
        Io.prototype.emit = function() {};

        beforeEach(function() {
            // create chrome.socket stub

            stubIo = sinon.createStubInstance(Io);

            window.io = function() {
                return stubIo;
            };

            stubIo.emit.withArgs('open').yields(42);

            socket = TcpSocket.open('127.0.0.1', 9000, {
                useSecureTransport: false,
            });
            expect(socket).to.exist;
        });

        afterEach(function() {
            stubIo.destroyed = true;
        });

        describe('open and read', function() {
            it('work without ssl', function(done) {
                var testData = new Uint8Array([0, 1, 2]);

                socket.ondata = function(e) {
                    var buf = new Uint8Array(e.data);
                    expect(buf).to.deep.equal(testData);
                    done();
                };

                socket.onopen = function() {
                    expect(socket._socketId).to.equal(42);
                };

                stubIo.on.withArgs('data-42').callsArgWithAsync(1, testData);
            });
        });

        describe('close', function() {
            it('should work', function(done) {
                socket.onclose = function() {
                    expect(socket.readyState).to.equal('closed');
                    done();
                };

                stubIo.on.withArgs('close-42').callsArgWithAsync(1);

                socket.onopen = function() {
                    socket.close();
                    expect(stubIo.emit.withArgs('end-42').callCount).to.equal(1);
                };
            });
        });

        describe('send', function() {
            it('should not explode', function(done) {
                socket.onopen = function() {
                    stubIo.emit.withArgs('data-42').callsArgWithAsync(2);

                    socket.ondrain = function() {
                        done();
                    };

                    socket.send(new Uint8Array([0, 1, 2]).buffer);
                };
            });
        });
    });
});