'use strict';

var net = require('net'),
    tls = require('tls'),
    crypto = require('crypto'),
    netPort = 8000,
    tlsPort = 9000,
    key = '-----BEGIN RSA PRIVATE KEY-----\r\nMIICWwIBAAKBgQDA9jfkw2yzUyfc15vECzGMZT2wfM4O5lyobFH/Z3rGNerxPIwm\r\nDyxlOCq5cE8/K8FNuaNm9NkbECSX9WR7yyUTG8kX7cG6Hhw1ICsE5RKWa/7uIJIa\r\nu517Q5N6A2zBM4YLCAewQZhdv4fYNCz3vsTuyGznD5pAR7bIfCHR6lblBQIDAQAB\r\nAoGAY0hMSfAjJcFLaV2mT6BSxiHxM7WDcDcmxaG2LutXSFTFpYm5sntsJEhZ8z/O\r\nBnrE4vD5Gigw7LPJoEYqhWdokx+neXzrpMcQGToNxn8aQO5WbYcAuIx5j893spwz\r\nG0cPfYVLsCb9epxWTmsxpN8P+W7MeyLX6YbIktJJn0LGBgECQQDgSZ7DSdzori5f\r\n8c/5Yse5lqZT8Gaot004AcVF371apfiQxbI9OQihkKB/zJkg9DHddFCIQV6Z++1o\r\nWKknFn01AkEA3D64eshD1MM8bLhC2k+Km6Lr7RPjtjNnIPOoE+8bVdkNgouffgsk\r\nFvliFij6dVQqbueBs5mnM0VxIgZea2NSkQJAAlBAFvuYD75cNBkmcAgYz01CgfMk\r\n2/CoFz/NbR8VsO2tVrDzWbZQ5Hm9bhQKMFDUgthETGOAOk5i8ISZmhGdUQJAXvfA\r\njlj6Pqzsyiht0zrHFrMargCMiM0DZAcMa4QHsm3EUI0p+ayOJEXmUI3c6WigX2/9\r\n0lan7Qi9bqF2ZzHNsQJAeyiq21084T9XNoqInoiBSCfWpqYqNK45qwBbktqJEz22\r\nshQluCz31kX0gGgE54hprJGkY/Ryq2g8Sk2XyREwcA==\r\n-----END RSA PRIVATE KEY-----\r\n',
    cert = '-----BEGIN CERTIFICATE-----\r\nMIICKTCCAZICCQDpQ20Tsi+iMDANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRIwEAYDVQQDEwlsb2NhbGhvc3QwHhcNMTQwMzE3MTM1MzMxWhcN\r\nMTQwNDE2MTM1MzMxWjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\r\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwls\r\nb2NhbGhvc3QwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMD2N+TDbLNTJ9zX\r\nm8QLMYxlPbB8zg7mXKhsUf9nesY16vE8jCYPLGU4KrlwTz8rwU25o2b02RsQJJf1\r\nZHvLJRMbyRftwboeHDUgKwTlEpZr/u4gkhq7nXtDk3oDbMEzhgsIB7BBmF2/h9g0\r\nLPe+xO7IbOcPmkBHtsh8IdHqVuUFAgMBAAEwDQYJKoZIhvcNAQEFBQADgYEAbs6+\r\nswTx03uGJfihujLC7sUiTmv9rFOTiqgElhK0R3Pft4nbWL1Jhn4twUwCa+csCDEA\r\nroItaeKZAC5zUGA4uXn1R0dZdOdLOff7998zSY3V5/cMAUYFztqSJjvqllDXxAmF\r\n30HHOMhiXQI1Wm0pqKlgzGCBt0fObgSaob9Zqbs=\r\n-----END CERTIFICATE-----\r\n';

net.createServer(function(socket) {
    console.log('> writing 4096 bytes to tcp socket.');
    socket.write(crypto.pseudoRandomBytes(4096), function() {
        console.log('> tcp socket is done');
        socket.end();
    });
}).listen(netPort);

tls.createServer({
    key: key,
    cert: cert
}, function(socket) {
    console.log('> writing 4096 bytes to tls socket.');
    socket.write(crypto.pseudoRandomBytes(4096), function() {
        console.log('> tls socket is done');
        socket.end();
    });
}).listen(tlsPort);

console.log('> tcp socket listening to: ' + netPort);
console.log('> tls socket listening to: ' + tlsPort);