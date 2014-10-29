'use strict';

var net = require('net'),
    tls = require('tls'),
    crypto = require('crypto'),
    startTls = require('starttls').startTls,
    netPort = 8000,
    tlsPort = 9000,
    badTlsPort = 10000,
    startTlsPort = 11000,
    size = 2048,
    key = '-----BEGIN RSA PRIVATE KEY-----\r\nMIICXQIBAAKBgQDMVAhOUdnXYTjP74qJF9cgDgizV65E83lbvAEeV5FOA7Wt5zXk\r\niNpGd+95Ht7tVvctoMKF621Nm0KKBQVKi7D++cLjrc3zPzmv18fLUb6retrQ+x2d\r\n+ZyY74AWET+se9lIfHSHmDxMMdZsVbkgTxxrt1ODC4fsI/91F/L/kqvMuwIDAQAB\r\nAoGAJo6o7paVhAYtoVdzjgE4sCzVyXn/QbWsLfphP6eInO8oRoO98L0+a1PQlcuU\r\nh7cEd9DBRGIzwxRMTx05bWLE6FJCB/ot2St8lBbluPvgIHsCbQgEuJc8vRPj+cAK\r\nn7YHAi8wXuM83MGnkbBu+FUSuoqOjZwXxTdiCD7snWLJinkCQQDq8g4YZLbXSWyt\r\nDd3lNZMXiaWrbzVqeOCi8L0r3q6qr0pLOZeeaDofxLrJSJvhHn90sPRl6kKp1sm2\r\nzy55ykqtAkEA3qOUJVKlDz4/vdN+pQDmpHZzEeAeKc4TkvspXi2D279nKMCY6zLQ\r\n1Vk5++BDGUkCvB9wOZLJuZmY1TrUPD0KBwJBANDHdNscdJZvexF1ZyAOMb4S5ZOo\r\naXFKJWTmRVS8t76Zso2SijeMK0qbydigm1S7g0uxDB2cxMykP/AhwA0eRKkCQCl9\r\nSF1QMmxNyGkioaY0LccWP8lj/5sAyUsJvSLMzpbD64B/q7+g36PylcineTmcDoNq\r\nRGqmPSt2QTHzXZvAMD8CQQCrxZ8xmD88O8LPdn0xX5v5088gKMODhXnmYMjrxE/Y\r\neqdHMk4ZAmbUjHm4r8h/wqLJE3tLinGiWJVErefcKFGi\r\n-----END RSA PRIVATE KEY-----\r\n',
    cert = '-----BEGIN CERTIFICATE-----\r\nMIICKTCCAZICCQCX7UAbAx6U3TANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRIwEAYDVQQDEwkxMjcuMC4wLjEwHhcNMTQwNzE4MTAzMjM0WhcN\r\nMTUwNzE4MTAzMjM0WjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\r\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwkx\r\nMjcuMC4wLjEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMxUCE5R2ddhOM/v\r\niokX1yAOCLNXrkTzeVu8AR5XkU4Dta3nNeSI2kZ373ke3u1W9y2gwoXrbU2bQooF\r\nBUqLsP75wuOtzfM/Oa/Xx8tRvqt62tD7HZ35nJjvgBYRP6x72Uh8dIeYPEwx1mxV\r\nuSBPHGu3U4MLh+wj/3UX8v+Sq8y7AgMBAAEwDQYJKoZIhvcNAQEFBQADgYEAR254\r\nkwjzVMq3lMSu/dU9c4EX7GdP55FlPqlEGvbY2mZ6qDIBCqJsgsLOsznNMl+nABpD\r\nj+4w78Tmu2ixV+VFpxp47mgyYf1BXgZgI1dBcFi/8kXep+939PCw+6V3EptF9OKC\r\nv1JnnpbBq3j9M7LZCYcx2j1/9cE2Clhk38Q6a5I=\r\n-----END CERTIFICATE-----\r\n',
    badKey = '-----BEGIN RSA PRIVATE KEY-----\r\nMIICWwIBAAKBgQCqfskiNyb2i1ncg0cznioKp9eghtHMfLDBduvF5cuNXhgm/o+j\r\nkWB550fOJGczjPdTTA6gGVm3P9/HXHaJw53yY6rfiUrsxokoVBLsASNiT1w5es0g\r\nx90Gj6LBqTqkDk+apABX4heodloMQKtBUkRmgHxhgHF1s40nsUM7mC4AlQIDAQAB\r\nAoGAPGmMb3lHbxjVkJNbyWiD0R7EAveCo4iTQRoYVRkl1UPAHyEYWIcMvmU7RkoT\r\n32pVwMg0bnpNFeemLYgP4KTV9BdRAZFvmfZpNar97doFSKgt8SpOEwe1FQfVBfP0\r\nxvWpVEbajoQc4iNGaHMMjx8eKXnl3Ek2g19naiHpPfy62IECQQDVptsADxxSS8oe\r\nX15YqlmzI9Una0HL4E0MzhFzpRkDsW0D/2TLrQAz6MK7omcDYEo6qRKVF+q5q8d/\r\nRkTR8uMlAkEAzEoTolVf5gnzeRAJILXbVFZGNJFIHKOezP/4lRD1Q6GHu8DGTPK2\r\ni4D3ZYnxODvJ/R5FB6w3dX7CiXtSj4rksQJAdl40FQtKIJoWx88EgVEX0zT2Ahnd\r\nYSvK5F5CsvR0MGSbRky3tlQJubiqMrReKDOvzGIhhnKyu91c8LmopTzQ9QJADdPl\r\nyFMnDpcV19fyBjjJA8hjMCO1UdrxYMbiuJRRRaalXVwLECJNoNu14zWXEktZvLxT\r\nx9UsW9Ocr1mdmQG5wQJAGwg2kKUvicCoSPVIcKiQv6Uw7ydnDRpW0Btxtq51et4C\r\nbF4FDRIAa3NSZrPQXX4B6B/4NKYuYFgOroZzLG/G5w==\r\n-----END RSA PRIVATE KEY-----',
    badCert = '-----BEGIN CERTIFICATE-----\r\nMIICKzCCAZQCCQCbD/tErCnh8DANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJB\r\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\r\ncyBQdHkgTHRkMRMwEQYDVQQDEwpiYWRob3N0LmlvMB4XDTE0MDcyMTE0NDI1OVoX\r\nDTE1MDcyMTE0NDI1OVowWjELMAkGA1UEBhMCQVUxEzARBgNVBAgTClNvbWUtU3Rh\r\ndGUxITAfBgNVBAoTGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDETMBEGA1UEAxMK\r\nYmFkaG9zdC5pbzCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAqn7JIjcm9otZ\r\n3INHM54qCqfXoIbRzHywwXbrxeXLjV4YJv6Po5FgeedHziRnM4z3U0wOoBlZtz/f\r\nx1x2icOd8mOq34lK7MaJKFQS7AEjYk9cOXrNIMfdBo+iwak6pA5PmqQAV+IXqHZa\r\nDECrQVJEZoB8YYBxdbONJ7FDO5guAJUCAwEAATANBgkqhkiG9w0BAQUFAAOBgQCb\r\nFxaEXabJO1O4CmqE8lJiiqajivxS1gD/3t3ZAV/wFcWmslzPO5VrzMEy1gx4oLFZ\r\niF7HFUheTU2uxuIAczFPhEwiDJr8qUtJA43PmvT2tBlkQUONB22Qu2LTR68lEmku\r\nHpj+iyn1wH28Uq2ZKNL8pWaVXfz0EJ9GtSXlnXkx3g==\r\n-----END CERTIFICATE-----';

net.createServer(function(socket) {
    console.log('> writing ' + size + ' bytes to tcp socket.');

    var bytesReceived = 0;
    socket.on('data', function(chunk) {
        bytesReceived += chunk.length;
        if (bytesReceived === 8) {
            socket.end();
        }
    });

    socket.write(crypto.pseudoRandomBytes(size), function() {
        console.log('> tcp socket is done');
    });
}).listen(netPort);

net.createServer(function(socket) {
    startTls(socket, {
        key: key,
        cert: cert,
        isServer: true,
        requestCert: false,
        rejectUnauthorized: false
    }, function(err, cleartextSocket) {
        if (err) {
            throw err;
        }

        console.log('> writing ' + size + ' bytes to starttls socket.');
        cleartextSocket.write(crypto.pseudoRandomBytes(size), function() {
            console.log('> starttls socket is done');
            cleartextSocket.end();
        });
    });
}).listen(startTlsPort);

tls.createServer({
    key: key,
    cert: cert
}, function(socket) {
    console.log('> writing ' + size + ' bytes to tls socket.');

    var bytesReceived = 0;
    socket.on('data', function(chunk) {
        bytesReceived += chunk.length;
        if (bytesReceived === 8) {
            socket.end();
        }
    });

    socket.write(crypto.pseudoRandomBytes(size), function() {
        console.log('> tls socket is done');
    });
}).listen(tlsPort);

tls.createServer({
    key: badKey,
    cert: badCert
}, function() {}).listen(badTlsPort);

console.log('> tcp socket listening to: ' + netPort);
console.log('> tls socket listening to: ' + tlsPort);
console.log('> bad tls socket listening to: ' + badTlsPort);
console.log('> starttls socket listening to: ' + startTlsPort);