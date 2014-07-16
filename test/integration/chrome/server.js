'use strict';

var net = require('net'),
    tls = require('tls'),
    crypto = require('crypto'),
    netPort = 8000,
    tlsPort = 9000,
    key = '-----BEGIN RSA PRIVATE KEY-----\r\nMIICXQIBAAKBgQDMVAhOUdnXYTjP74qJF9cgDgizV65E83lbvAEeV5FOA7Wt5zXk\r\niNpGd+95Ht7tVvctoMKF621Nm0KKBQVKi7D++cLjrc3zPzmv18fLUb6retrQ+x2d\r\n+ZyY74AWET+se9lIfHSHmDxMMdZsVbkgTxxrt1ODC4fsI/91F/L/kqvMuwIDAQAB\r\nAoGAJo6o7paVhAYtoVdzjgE4sCzVyXn/QbWsLfphP6eInO8oRoO98L0+a1PQlcuU\r\nh7cEd9DBRGIzwxRMTx05bWLE6FJCB/ot2St8lBbluPvgIHsCbQgEuJc8vRPj+cAK\r\nn7YHAi8wXuM83MGnkbBu+FUSuoqOjZwXxTdiCD7snWLJinkCQQDq8g4YZLbXSWyt\r\nDd3lNZMXiaWrbzVqeOCi8L0r3q6qr0pLOZeeaDofxLrJSJvhHn90sPRl6kKp1sm2\r\nzy55ykqtAkEA3qOUJVKlDz4/vdN+pQDmpHZzEeAeKc4TkvspXi2D279nKMCY6zLQ\r\n1Vk5++BDGUkCvB9wOZLJuZmY1TrUPD0KBwJBANDHdNscdJZvexF1ZyAOMb4S5ZOo\r\naXFKJWTmRVS8t76Zso2SijeMK0qbydigm1S7g0uxDB2cxMykP/AhwA0eRKkCQCl9\r\nSF1QMmxNyGkioaY0LccWP8lj/5sAyUsJvSLMzpbD64B/q7+g36PylcineTmcDoNq\r\nRGqmPSt2QTHzXZvAMD8CQQCrxZ8xmD88O8LPdn0xX5v5088gKMODhXnmYMjrxE/Y\r\neqdHMk4ZAmbUjHm4r8h/wqLJE3tLinGiWJVErefcKFGi\r\n-----END RSA PRIVATE KEY-----\r\n',
    cert = '-----BEGIN CERTIFICATE-----\r\nMIICKTCCAZICCQCX7UAbAx6U3TANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRIwEAYDVQQDEwkxMjcuMC4wLjEwHhcNMTQwNzE4MTAzMjM0WhcN\r\nMTUwNzE4MTAzMjM0WjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\r\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwkx\r\nMjcuMC4wLjEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMxUCE5R2ddhOM/v\r\niokX1yAOCLNXrkTzeVu8AR5XkU4Dta3nNeSI2kZ373ke3u1W9y2gwoXrbU2bQooF\r\nBUqLsP75wuOtzfM/Oa/Xx8tRvqt62tD7HZ35nJjvgBYRP6x72Uh8dIeYPEwx1mxV\r\nuSBPHGu3U4MLh+wj/3UX8v+Sq8y7AgMBAAEwDQYJKoZIhvcNAQEFBQADgYEAR254\r\nkwjzVMq3lMSu/dU9c4EX7GdP55FlPqlEGvbY2mZ6qDIBCqJsgsLOsznNMl+nABpD\r\nj+4w78Tmu2ixV+VFpxp47mgyYf1BXgZgI1dBcFi/8kXep+939PCw+6V3EptF9OKC\r\nv1JnnpbBq3j9M7LZCYcx2j1/9cE2Clhk38Q6a5I=\r\n-----END CERTIFICATE-----\r\n';

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