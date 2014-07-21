'use strict';

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(function(require) {

    var expect = require('chai').expect,
        TcpSocket = require('../../src/tcp-socket'),
        echoServer;

    describe('TcpSocket integration tests', function() {
        var socket;

        before(function(done) {
            // start test server
            var net = require('net');

            echoServer = net.createServer(function(socket) {
                socket.pipe(socket);
            });

            echoServer.listen(6789, done);
        });

        beforeEach(function(done) {
            // build deps
            socket = TcpSocket.open('127.0.0.1', 6789, {
                useSecureTransport: false,
            });

            expect(socket).to.exist;

            socket.onopen = function() {
                done();
            };
        });

        after(function() {
            echoServer.close();
        });

        describe('send', function() {
            it('should echo the data back', function(done) {
                var buf = s2a('asdf');

                socket.ondata = function(e) {
                    var echoedStr = a2s(e.data);
                    expect(echoedStr).to.equal('asdf');
                    expect(e.type).to.equal('data');
                    done();
                };

                socket.send(buf);
            });
        });

        describe('close', function() {
            it('should echo the data back', function(done) {
                socket.onclose = function(e) {
                    expect(e.type).to.equal('close');
                    expect(socket.readyState).to.equal('closed');
                    done();
                };

                socket.close();
                expect(socket.readyState).to.equal('closing');
            });
        });

    });

    //
    // Helper functions
    //

    // array buffer -> singlebyte string
    function a2s(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    // singlebyte string -> array buffer
    function s2a(str) {
        var view = new Uint8Array(str.length);
        for (var i = 0, j = str.length; i < j; i++) {
            view[i] = str.charCodeAt(i);
        }
        return view.buffer;
    }

});