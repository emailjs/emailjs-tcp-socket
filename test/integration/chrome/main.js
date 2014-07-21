(function() {
    'use strict';

    var t0 = new Date().getTime();

    var tcpBytes = 0;
    var tcp = navigator.TCPSocket.open('127.0.0.1', 8000);
    tcp.onopen = function() {
        console.log('> tcp socket state: ' + tcp.readyState);
    };
    tcp.onerror = function(e) {
        console.error(e.data);
    };
    tcp.ondata = function(e) {
        tcpBytes += e.data.byteLength;
    };
    tcp.onclose = function() {
        console.log('> tcp socket received ' + tcpBytes + ' bytes in ' + (new Date().getTime() - t0) + ' ms');
        console.log('> tcp socket state: ' + tcp.readyState);
    };

    //
    // This TLS socket has a pinned cert, thus will only connect to a host with the correct certificate
    //
    var tlsBytes = 0;
    var tls = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: true,
        ca: '-----BEGIN CERTIFICATE-----\r\nMIICKTCCAZICCQCX7UAbAx6U3TANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRIwEAYDVQQDEwkxMjcuMC4wLjEwHhcNMTQwNzE4MTAzMjM0WhcN\r\nMTUwNzE4MTAzMjM0WjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\r\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwkx\r\nMjcuMC4wLjEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMxUCE5R2ddhOM/v\r\niokX1yAOCLNXrkTzeVu8AR5XkU4Dta3nNeSI2kZ373ke3u1W9y2gwoXrbU2bQooF\r\nBUqLsP75wuOtzfM/Oa/Xx8tRvqt62tD7HZ35nJjvgBYRP6x72Uh8dIeYPEwx1mxV\r\nuSBPHGu3U4MLh+wj/3UX8v+Sq8y7AgMBAAEwDQYJKoZIhvcNAQEFBQADgYEAR254\r\nkwjzVMq3lMSu/dU9c4EX7GdP55FlPqlEGvbY2mZ6qDIBCqJsgsLOsznNMl+nABpD\r\nj+4w78Tmu2ixV+VFpxp47mgyYf1BXgZgI1dBcFi/8kXep+939PCw+6V3EptF9OKC\r\nv1JnnpbBq3j9M7LZCYcx2j1/9cE2Clhk38Q6a5I=\r\n-----END CERTIFICATE-----\r\n'
    });
    tls.onopen = function() {
        console.log('> tls socket state: ' + tls.readyState);
    };
    tls.onerror = function(e) {
        console.error(e.data);
    };
    tls.ondata = function(e) {
        tlsBytes += e.data.byteLength;
    };
    tls.onclose = function() {
        console.log('> tls socket received ' + tlsBytes + ' bytes in ' + (new Date().getTime() - t0) + ' ms');
        console.log('> tls socket state: ' + tls.readyState);
    };

    //
    // This TLS socket has no pinned cert, thus will accept the connection
    //
    var tlsNoCertBytes = 0;
    var tlsNoCert = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: true
    });
    tlsNoCert.onopen = function() {
        console.log('> tlsNoCert socket state: ' + tlsNoCert.readyState);
    };
    tlsNoCert.onerror = function(e) {
        console.error(e.data);
    };
    tlsNoCert.ondata = function(e) {
        tlsNoCertBytes += e.data.byteLength;
    };
    tlsNoCert.onclose = function() {
        console.log('> tlsNoCert socket received ' + tlsNoCertBytes + ' bytes in ' + (new Date().getTime() - t0) + ' ms');
        console.log('> tlsNoCert socket state: ' + tlsNoCert.readyState);
    };
    tlsNoCert.oncert = function(pem) {
        console.log('> tlsNoCert tls certificate received: ' + pem);
    };

    //
    // This TLS socket the false certificate
    //
    var tlsFalseCert = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: true,
        ca: '-----BEGIN CERTIFICATE-----\r\nMIICKzCCAZQCCQCbD/tErCnh8DANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRMwEQYDVQQDEwpiYWRob3N0LmlvMB4XDTE0MDcyMTE0NDI1OVoX\r\nDTE1MDcyMTE0NDI1OVowWjELMAkGA1UEBhMCQVUxEzARBgNVBAgTClNvbWUtU3Rh\r\ndGUxITAfBgNVBAoTGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDETMBEGA1UEAxMK\r\nYmFkaG9zdC5pbzCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAqn7JIjcm9otZ\r\n3INHM54qCqfXoIbRzHywwXbrxeXLjV4YJv6Po5FgeedHziRnM4z3U0wOoBlZtz/f\r\nx1x2icOd8mOq34lK7MaJKFQS7AEjYk9cOXrNIMfdBo+iwak6pA5PmqQAV+IXqHZa\r\nDECrQVJEZoB8YYBxdbONJ7FDO5guAJUCAwEAATANBgkqhkiG9w0BAQUFAAOBgQCb\r\nFxaEXabJO1O4CmqE8lJiiqajivxS1gD/3t3ZAV/wFcWmslzPO5VrzMEy1gx4oLFZ\r\niF7HFUheTU2uxuIAczFPhEwiDJr8qUtJA43PmvT2tBlkQUONB22Qu2LTR68lEmku\r\nHpj+iyn1wH28Uq2ZKNL8pWaVXfz0EJ9GtSXlnXkx3g==\r\n-----END CERTIFICATE-----'
    });
    tlsFalseCert.onopen = tlsFalseCert.ondata = function() {
        console.error('The TLS shim must not be able to connect to a TLS socket with invalid CN!');
    };
    tlsFalseCert.onerror = function(e) {
        console.log('> Received an error as expected! ' + e.data.message);
    };
    tlsFalseCert.onclose = function() {
        console.log('> invalidCommonNameTls closed');
    };
    tlsFalseCert.oncert = function(pem) {
        console.log('> tlsFalseCert tls certificate update received:\n' + pem);
    };

    //
    // This TLS socket connects to a host the present a certificate with a false CN
    //
    var invalidCommonNameTls = navigator.TCPSocket.open('127.0.0.1', 10000, {
        useSecureTransport: true
    });
    invalidCommonNameTls.oncert = invalidCommonNameTls.onopen = invalidCommonNameTls.ondata = function() {
        console.error('The TLS shim must not be able to connect to a TLS socket with invalid CN!');
    };
    invalidCommonNameTls.onerror = function(e) {
        console.log('> Received an error as expected! ' + e.data.message);
    };
    invalidCommonNameTls.onclose = function() {
        console.log('> invalidCommonNameTls closed');
    };
})();