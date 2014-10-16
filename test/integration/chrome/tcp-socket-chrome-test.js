'use strict';

define(function(require) {
    var expect = require('chai').expect,
        TcpSocket = require('tcp-socket');

    describe('TcpSocket chrome shim integration tests', function() {
        var localhost = '127.0.0.1';
        var tcpPort = 8000,
            tlsPort = 9000,
            startTlsPort = 11000,
            tlsInvalidCNPort = 10000,
            size = 2048;

        var opened, errored, bytesCtr, drained;

        beforeEach(function(done) {
            opened = false;
            errored = false;
            drained = false;
            bytesCtr = 0;

            setTimeout(done, 500); // time to load up the dev tools before the tests fire
        });

        describe('tcp', function() {
            it('should open, read, write, and close', function(done) {
                var socket = TcpSocket.open(localhost, tcpPort);
                socket.onopen = function() {
                    opened = true;
                };

                socket.onerror = function() {
                    // don't do expect(e).to.not.exist because expections 
                    // thrown in a socket callback silently disappear
                    // instead of bubbling up to window
                    errored = true;
                };
                socket.ondata = function(e) {
                    bytesCtr += e.data.byteLength;
                    if (bytesCtr === size) {
                        socket.send(new Uint8Array([1, 2, 1, 2, 1, 2, 1, 2]).buffer);
                    }
                };

                socket.ondrain = function() {
                    drained = true;
                };

                socket.onclose = function() {
                    expect(opened).to.be.true;
                    expect(drained).to.be.true;
                    expect(errored).to.be.false;
                    expect(bytesCtr).to.equal(size);

                    done();
                };
            });
        });

        describe('tls', function() {
            it('should open, read, write, and close', function(done) {
                var socket = TcpSocket.open(localhost, tlsPort, {
                    useSecureTransport: true
                });
                socket.onopen = function() {
                    opened = true;
                };
                socket.onerror = function() {
                    // don't do expect(e).to.not.exist because expections 
                    // thrown in a socket callback silently disappear
                    // instead of bubbling up to window
                    errored = true;
                };
                socket.ondata = function(e) {
                    bytesCtr += e.data.byteLength;
                    if (bytesCtr === size) {
                        socket.send(new Uint8Array([1, 2, 1, 2, 1, 2, 1, 2]).buffer);
                    }
                };

                socket.ondrain = function() {
                    drained = true;
                };

                socket.onclose = function() {
                    expect(opened).to.be.true;
                    expect(errored).to.be.false;
                    expect(drained).to.be.true;
                    expect(bytesCtr).to.equal(size);

                    done();
                };
            });
        });

        describe('starttls', function() {
            it('should open, read, write, and close', function(done) {
                var socket = TcpSocket.open(localhost, startTlsPort);
                socket.onopen = function() {
                    opened = true;
                    socket.upgradeToSecure();
                };
                socket.onerror = function(e) {
                    console.log(e.data);
                    errored = true;
                };
                socket.ondata = function(e) {
                    bytesCtr += e.data.byteLength;
                };

                socket.onclose = function() {
                    expect(opened).to.be.true;
                    expect(errored).to.be.false;
                    expect(bytesCtr).to.equal(size);

                    done();
                };
            });
        });

        describe('tls w/ false invalid common name', function() {
            it('should error', function(done) {
                var socket = TcpSocket.open('127.0.0.1', tlsInvalidCNPort, {
                    useSecureTransport: true
                });
                socket.onopen = function() {
                    opened = true;
                };
                socket.onerror = function(e) {
                    console.log(e.data);
                    errored = true;
                };
                socket.ondata = function(e) {
                    bytesCtr += e.data.byteLength;
                };

                socket.onclose = function() {
                    expect(opened).to.be.false;
                    expect(errored).to.be.true;
                    expect(bytesCtr).to.equal(0);

                    done();
                };
            });
        });
    });
});