'use strict';

var expect = require('chai').expect,
    TcpSocket = require('../../src/tcp-socket'),
    net = require('net'),
    tls = require('tls'),
    startTls = require('starttls').startTls;

describe('tcp-socket integration tests', function() {
    var key = '-----BEGIN RSA PRIVATE KEY-----\r\nMIICXQIBAAKBgQDMVAhOUdnXYTjP74qJF9cgDgizV65E83lbvAEeV5FOA7Wt5zXk\r\niNpGd+95Ht7tVvctoMKF621Nm0KKBQVKi7D++cLjrc3zPzmv18fLUb6retrQ+x2d\r\n+ZyY74AWET+se9lIfHSHmDxMMdZsVbkgTxxrt1ODC4fsI/91F/L/kqvMuwIDAQAB\r\nAoGAJo6o7paVhAYtoVdzjgE4sCzVyXn/QbWsLfphP6eInO8oRoO98L0+a1PQlcuU\r\nh7cEd9DBRGIzwxRMTx05bWLE6FJCB/ot2St8lBbluPvgIHsCbQgEuJc8vRPj+cAK\r\nn7YHAi8wXuM83MGnkbBu+FUSuoqOjZwXxTdiCD7snWLJinkCQQDq8g4YZLbXSWyt\r\nDd3lNZMXiaWrbzVqeOCi8L0r3q6qr0pLOZeeaDofxLrJSJvhHn90sPRl6kKp1sm2\r\nzy55ykqtAkEA3qOUJVKlDz4/vdN+pQDmpHZzEeAeKc4TkvspXi2D279nKMCY6zLQ\r\n1Vk5++BDGUkCvB9wOZLJuZmY1TrUPD0KBwJBANDHdNscdJZvexF1ZyAOMb4S5ZOo\r\naXFKJWTmRVS8t76Zso2SijeMK0qbydigm1S7g0uxDB2cxMykP/AhwA0eRKkCQCl9\r\nSF1QMmxNyGkioaY0LccWP8lj/5sAyUsJvSLMzpbD64B/q7+g36PylcineTmcDoNq\r\nRGqmPSt2QTHzXZvAMD8CQQCrxZ8xmD88O8LPdn0xX5v5088gKMODhXnmYMjrxE/Y\r\neqdHMk4ZAmbUjHm4r8h/wqLJE3tLinGiWJVErefcKFGi\r\n-----END RSA PRIVATE KEY-----\r\n',
        cert = '-----BEGIN CERTIFICATE-----\r\nMIICKTCCAZICCQCX7UAbAx6U3TANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRIwEAYDVQQDEwkxMjcuMC4wLjEwHhcNMTQwNzE4MTAzMjM0WhcN\r\nMTUwNzE4MTAzMjM0WjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\r\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwkx\r\nMjcuMC4wLjEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMxUCE5R2ddhOM/v\r\niokX1yAOCLNXrkTzeVu8AR5XkU4Dta3nNeSI2kZ373ke3u1W9y2gwoXrbU2bQooF\r\nBUqLsP75wuOtzfM/Oa/Xx8tRvqt62tD7HZ35nJjvgBYRP6x72Uh8dIeYPEwx1mxV\r\nuSBPHGu3U4MLh+wj/3UX8v+Sq8y7AgMBAAEwDQYJKoZIhvcNAQEFBQADgYEAR254\r\nkwjzVMq3lMSu/dU9c4EX7GdP55FlPqlEGvbY2mZ6qDIBCqJsgsLOsznNMl+nABpD\r\nj+4w78Tmu2ixV+VFpxp47mgyYf1BXgZgI1dBcFi/8kXep+939PCw+6V3EptF9OKC\r\nv1JnnpbBq3j9M7LZCYcx2j1/9cE2Clhk38Q6a5I=\r\n-----END CERTIFICATE-----\r\n',
        port = 6789,
        echoServer, socket;

    // disable warning for self-signed certs
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    describe('tcp socket', function() {
        before(function(done) {
            // start test server
            echoServer = net.createServer(function(socket) {
                socket.pipe(socket);
            });
            echoServer.listen(port, done);
        });

        beforeEach(function(done) {
            socket = TcpSocket.open('127.0.0.1', port, {
                useSecureTransport: false,
            });

            socket.onerror = function(e) {
                expect(e.data).to.not.exist;
            };

            socket.onopen = function() {
                done();
            };
        });

        after(function(done) {
            echoServer.close(done);
        });

        describe('open/send/receive/close', function() {
            it('should echo the data back', function(done) {
                var payload = 'asdf';

                socket.ondata = function(e) {
                    var echoedStr = a2s(e.data);
                    expect(echoedStr).to.equal(payload);
                    expect(e.type).to.equal('data');

                    socket.close();
                    expect(socket.readyState).to.equal('closing');
                };

                socket.onclose = function(e) {
                    expect(e.type).to.equal('close');
                    expect(socket.readyState).to.equal('closed');
                    done();
                };

                socket.send(s2a(payload));
            });
        });
    });

    describe('tls socket', function() {
        before(function(done) {
            // start test server
            echoServer = tls.createServer({
                key: key,
                cert: cert
            }, function(socket) {
                socket.pipe(socket);
            });
            echoServer.listen(port, done);
        });

        beforeEach(function(done) {
            socket = TcpSocket.open('127.0.0.1', port, {
                useSecureTransport: true
            });

            socket.onerror = function(e) {
                expect(e.data).to.not.exist;
            };

            socket.onopen = function() {
                done();
            };
        });

        after(function(done) {
            echoServer.close(done);
        });

        describe('open/send/receive/close', function() {
            it('should echo the data back', function(done) {
                var payload = 'asdf';

                socket.ondata = function(e) {
                    var echoedStr = a2s(e.data);
                    expect(echoedStr).to.equal(payload);
                    expect(e.type).to.equal('data');

                    socket.close();
                    expect(socket.readyState).to.equal('closing');
                };

                socket.onclose = function(e) {
                    expect(e.type).to.equal('close');
                    expect(socket.readyState).to.equal('closed');
                    done();
                };

                socket.send(s2a(payload));
            });
        });
    });

    describe('starttls socket', function() {
        before(function(done) {
            echoServer = net.createServer(function(socket) {
                startTls(socket, {
                    key: key,
                    cert: cert,
                    isServer: true,
                    requestCert: false,
                    rejectUnauthorized: false
                }, function(err, cleartextSocket) {
                    expect(err).to.not.exist;
                    cleartextSocket.pipe(cleartextSocket);
                });
            });

            echoServer.listen(port, done);
        });

        beforeEach(function(done) {
            socket = TcpSocket.open('127.0.0.1', port, {
                useSecureTransport: false
            });

            socket.onerror = function(e) {
                expect(e.data).to.not.exist;
            };

            socket.onopen = function() {
                done();
            };
        });

        after(function(done) {
            echoServer.close(done);
        });

        describe('open/upgrade/send/receive/close', function() {
            it('should echo the data back', function(done) {
                socket.upgradeToSecure();

                setTimeout(function() {
                    var payload = 'asdf';

                    socket.ondata = function(e) {
                        var echoedStr = a2s(e.data);
                        expect(echoedStr).to.equal(payload);
                        expect(e.type).to.equal('data');

                        socket.close();
                        expect(socket.readyState).to.equal('closing');
                    };

                    socket.onclose = function(e) {
                        expect(e.type).to.equal('close');
                        expect(socket.readyState).to.equal('closed');
                        done();
                    };

                    socket.send(s2a(payload));
                }, 30); // wait some time to finish the tls negotiation before writing to the socket
            });
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