'use strict';

define(function(require) {
    var expect = require('chai').expect,
        TcpSocket = require('tcp-socket');

    describe('TcpSocket chrome shim integration tests', function() {
        var localhost = '127.0.0.1';
        var tcpPort = 8000,
            tlsPort = 9000,
            startTlsPort = 11000,
            tlsInvalidCNPort = 10000;

        var socket, opened, errored, certReceived, bytesCtr;

        beforeEach(function() {
            opened = false,
            errored = false,
            certReceived = false,
            bytesCtr = 0;
        });

        describe('tcp', function() {
            it('should open, transfer, and close', function(done) {
                socket = TcpSocket.open(localhost, tcpPort);
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
                    expect(opened).to.be.true;
                    expect(errored).to.be.false;
                    expect(bytesCtr).to.equal(4096);

                    done();
                };
            });
        });

        describe('tls', function() {
            it('should open, transfer, and close', function(done) {
                socket = TcpSocket.open(localhost, tlsPort, {
                    useSecureTransport: true,
                    ca: '-----BEGIN CERTIFICATE-----\r\nMIICKTCCAZICCQCX7UAbAx6U3TANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRIwEAYDVQQDEwkxMjcuMC4wLjEwHhcNMTQwNzE4MTAzMjM0WhcN\r\nMTUwNzE4MTAzMjM0WjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\r\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwkx\r\nMjcuMC4wLjEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMxUCE5R2ddhOM/v\r\niokX1yAOCLNXrkTzeVu8AR5XkU4Dta3nNeSI2kZ373ke3u1W9y2gwoXrbU2bQooF\r\nBUqLsP75wuOtzfM/Oa/Xx8tRvqt62tD7HZ35nJjvgBYRP6x72Uh8dIeYPEwx1mxV\r\nuSBPHGu3U4MLh+wj/3UX8v+Sq8y7AgMBAAEwDQYJKoZIhvcNAQEFBQADgYEAR254\r\nkwjzVMq3lMSu/dU9c4EX7GdP55FlPqlEGvbY2mZ6qDIBCqJsgsLOsznNMl+nABpD\r\nj+4w78Tmu2ixV+VFpxp47mgyYf1BXgZgI1dBcFi/8kXep+939PCw+6V3EptF9OKC\r\nv1JnnpbBq3j9M7LZCYcx2j1/9cE2Clhk38Q6a5I=\r\n-----END CERTIFICATE-----\r\n'
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
                    expect(opened).to.be.true;
                    expect(errored).to.be.false;
                    expect(bytesCtr).to.equal(4096);

                    done();
                };
            });
        });

        describe('starttls', function() {
            it('should open, transfer, and close', function(done) {
                socket = TcpSocket.open(localhost, startTlsPort);
                socket.onopen = function() {
                    opened = true;
                    socket.upgradeToSecure();
                };
                socket.onerror = function(e) {
                    console.log(e.data);
                    errored = true;
                };
                socket.oncert = function(pem) {
                    certReceived = !!pem;
                };
                socket.ondata = function(e) {
                    bytesCtr += e.data.byteLength;
                };

                socket.onclose = function() {
                    expect(opened).to.be.true;
                    expect(certReceived).to.be.true;
                    expect(errored).to.be.false;
                    expect(bytesCtr).to.equal(4096);

                    done();
                };
            });
        });

        describe('tls w/ false pinned cert', function() {
            it('should error', function(done) {
                socket = TcpSocket.open('127.0.0.1', tlsPort, {
                    useSecureTransport: true,
                    ca: '-----BEGIN CERTIFICATE-----\r\nMIICKTCCAZICCQCU9cXAwUqlDzANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRIwEAYDVQQDEwkxMjcuMC4wLjEwHhcNMTQwOTAzMTIyMDMxWhcN\r\nMTUwOTAzMTIyMDMxWjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\r\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwkx\r\nMjcuMC4wLjEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAL64eJazMSt6Q0nQ\r\nB8f9QawSkAWXgVh5w0e6xr1/LMqQJ09hqa7zCyP0SwMp0uwWljMItrkNdjtlbcur\r\noWuRy/u8vH27P8ExaLWXtfUcxpOaWC5VM7e2vfu27FLqVsgby46tzXmiGfzcLDxF\r\nCHF5U/pA0A3uRraEJhb2XDfml6HtAgMBAAEwDQYJKoZIhvcNAQEFBQADgYEAODyH\r\njmMMRPB2UUliFLrjj6bqhDPTMOr+axhOYsLn0wSSEnlTvRy6/cWwfYz5nXfj/Dll\r\nTSjqWkBBIBSeigPftyrelZeOj8FxftemuaSBIRycUlv+6heBtZTnZC2YxICMrGAF\r\nCa0PiNzSkTLw5ISH5/1pBTkCo+mH9OYFR1uhHvo=\r\n-----END CERTIFICATE-----\r\n'
                });
                socket.onopen = function() {
                    opened = true;
                };
                socket.oncert = function(pem) {
                    certReceived = !!pem;
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
                    expect(certReceived).to.be.true;
                    expect(errored).to.be.true;
                    expect(bytesCtr).to.equal(0);

                    done();
                };
            });
        });

        describe('tls w/ false invalid common name', function() {
            it('should error', function(done) {
                socket = TcpSocket.open('127.0.0.1', tlsInvalidCNPort, {
                    useSecureTransport: true
                });
                socket.onopen = function() {
                    opened = true;
                };
                socket.oncert = function(pem) {
                    certReceived = !!pem;
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
                    expect(certReceived).to.be.false;
                    expect(errored).to.be.true;
                    expect(bytesCtr).to.equal(0);

                    done();
                };
            });
        });
    });
});