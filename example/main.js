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
        ca: '-----BEGIN CERTIFICATE-----\r\nMIICKTCCAZICCQDpQ20Tsi+iMDANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRIwEAYDVQQDEwlsb2NhbGhvc3QwHhcNMTQwMzE3MTM1MzMxWhcN\r\nMTQwNDE2MTM1MzMxWjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\r\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwls\r\nb2NhbGhvc3QwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMD2N+TDbLNTJ9zX\r\nm8QLMYxlPbB8zg7mXKhsUf9nesY16vE8jCYPLGU4KrlwTz8rwU25o2b02RsQJJf1\r\nZHvLJRMbyRftwboeHDUgKwTlEpZr/u4gkhq7nXtDk3oDbMEzhgsIB7BBmF2/h9g0\r\nLPe+xO7IbOcPmkBHtsh8IdHqVuUFAgMBAAEwDQYJKoZIhvcNAQEFBQADgYEAbs6+\r\nswTx03uGJfihujLC7sUiTmv9rFOTiqgElhK0R3Pft4nbWL1Jhn4twUwCa+csCDEA\r\nroItaeKZAC5zUGA4uXn1R0dZdOdLOff7998zSY3V5/cMAUYFztqSJjvqllDXxAmF\r\n30HHOMhiXQI1Wm0pqKlgzGCBt0fObgSaob9Zqbs=\r\n-----END CERTIFICATE-----\r\n'
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
})();