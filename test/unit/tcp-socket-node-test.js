'use strict';

var expect = require('chai').expect,
    sinon = require('sinon'),
    TcpSocket = require('../../src/tcp-socket');

describe('TcpSocket unit tests', function() {
    var socket, nodeSocketStub;

    beforeEach(function() {
        // build deps
        socket = TcpSocket.open('127.0.0.1', 9000, {
            useSecureTransport: false,
        });
        expect(socket).to.exist;
        expect(socket._socket).to.exist;

        var Socket = function() {};
        Socket.prototype.on = function() {};
        Socket.prototype.write = function() {};
        Socket.prototype.end = function() {};

        socket._socket = nodeSocketStub = sinon.createStubInstance(Socket);
    });

    describe('nodeShim', function() {

        describe('open', function() {
            it('should not explode', function() {
                // test case
                socket = TcpSocket.open('127.0.0.1', 9000, {
                    useSecureTransport: false,
                });
                expect(socket).to.exist;
            });
        });

        describe('close', function() {
            it('should not explode', function() {
                nodeSocketStub.end.returns();

                socket.close();
                expect(socket.readyState).to.equal('closing');
            });
        });

        describe('send', function() {
            it('should not explode', function(done) {
                nodeSocketStub.write.yields();

                socket.ondrain = function() {
                    done();
                };

                socket.send(new ArrayBuffer());
            });
        });

    });
});