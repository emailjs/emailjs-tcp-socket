'use strict';

define(function(require) {

    var expect = require('chai').expect,
        sinon = require('sinon'),
        TcpSocket = require('tcp-socket');

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
            stubIo.emit.withArgs('hostname').yields('hostname.io');

            socket = TcpSocket.open('127.0.0.1', 9000, {
                useSecureTransport: false,
                ca: '-----BEGIN CERTIFICATE-----\r\nMIIEBDCCAuygAwIBAgIDAjppMA0GCSqGSIb3DQEBBQUAMEIxCzAJBgNVBAYTAlVT\r\nMRYwFAYDVQQKEw1HZW9UcnVzdCBJbmMuMRswGQYDVQQDExJHZW9UcnVzdCBHbG9i\r\nYWwgQ0EwHhcNMTMwNDA1MTUxNTU1WhcNMTUwNDA0MTUxNTU1WjBJMQswCQYDVQQG\r\nEwJVUzETMBEGA1UEChMKR29vZ2xlIEluYzElMCMGA1UEAxMcR29vZ2xlIEludGVy\r\nbmV0IEF1dGhvcml0eSBHMjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\r\nAJwqBHdc2FCROgajguDYUEi8iT/xGXAaiEZ+4I/F8YnOIe5a/mENtzJEiaB0C1NP\r\nVaTOgmKV7utZX8bhBYASxF6UP7xbSDj0U/ck5vuR6RXEz/RTDfRK/J9U3n2+oGtv\r\nh8DQUB8oMANA2ghzUWx//zo8pzcGjr1LEQTrfSTe5vn8MXH7lNVg8y5Kr0LSy+rE\r\nahqyzFPdFUuLH8gZYR/Nnag+YyuENWllhMgZxUYi+FOVvuOAShDGKuy6lyARxzmZ\r\nEASg8GF6lSWMTlJ14rbtCMoU/M4iarNOz0YDl5cDfsCx3nuvRTPPuj5xt970JSXC\r\nDTWJnZ37DhF5iR43xa+OcmkCAwEAAaOB+zCB+DAfBgNVHSMEGDAWgBTAephojYn7\r\nqwVkDBF9qn1luMrMTjAdBgNVHQ4EFgQUSt0GFhu89mi1dvWBtrtiGrpagS8wEgYD\r\nVR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAQYwOgYDVR0fBDMwMTAvoC2g\r\nK4YpaHR0cDovL2NybC5nZW90cnVzdC5jb20vY3Jscy9ndGdsb2JhbC5jcmwwPQYI\r\nKwYBBQUHAQEEMTAvMC0GCCsGAQUFBzABhiFodHRwOi8vZ3RnbG9iYWwtb2NzcC5n\r\nZW90cnVzdC5jb20wFwYDVR0gBBAwDjAMBgorBgEEAdZ5AgUBMA0GCSqGSIb3DQEB\r\nBQUAA4IBAQA21waAESetKhSbOHezI6B1WLuxfoNCunLaHtiONgaX4PCVOzf9G0JY\r\n/iLIa704XtE7JW4S615ndkZAkNoUyHgN7ZVm2o6Gb4ChulYylYbc3GrKBIxbf/a/\r\nzG+FA1jDaFETzf3I93k9mTXwVqO94FntT0QJo544evZG0R0SnU++0ED8Vf4GXjza\r\nHFa9llF7b1cq26KqltyMdMKVvvBulRP/F/A8rLIQjcxz++iPAsbw+zOzlTvjwsto\r\nWHPbqCRiOwY1nQ2pM714A5AuTHhdUDqB1O6gyHA43LL5Z/qHQF1hwFGPa4NrzQU6\r\nyuGnBXj8ytqU0CwIPX4WecigUCAkVDNx\r\n-----END CERTIFICATE-----',
            });
            expect(socket).to.exist;
            expect(socket._ca).to.exist;
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

        describe('getHostname', function() {
            it('should return hostname', function(done) {
                TcpSocket.getHostname(function(err, hostname) {
                    expect(err).to.not.exist;
                    expect(hostname).to.equal('hostname.io');
                    done();
                });
            });
        });
    });
});