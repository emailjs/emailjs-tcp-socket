(function() {
    'use strict';

    var tcpBytes = 0;
    var t0 = new Date().getTime();

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

    var tlsBytes = 0;
    var tls = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSSL: true,
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

    var tlsNoCertBytes = 0;
    var tlsNoCert = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSSL: true
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

})();