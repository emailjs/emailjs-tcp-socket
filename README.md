tcp-socket
==========

This shim brings [Mozilla-flavored](https://developer.mozilla.org/en-US/docs/WebAPI/TCP_Socket) version of the [Raw Socket API](http://www.w3.org/TR/raw-sockets/) to node.js, Chromium apps, Windows/WP 8 apps, and websockets (via socket.io). Its purpose is to enable apps to use the same codebase in Firefox OS, Chrome OS, and on the server.

[![Build Status](https://travis-ci.org/whiteout-io/tcp-socket.svg?branch=dev/umd)](https://travis-ci.org/whiteout-io/tcp-socket)

# Usage

Include `tcp-socket.js` and `forge` in your markup. It will attach itself to the navigator object.

    <script src="forge.min.js"></script>
    <script src="tcp-socket.js"></script>

    // creates a TCP socket
    var tcp = navigator.TCPSocket.open('127.0.0.1', 8000);

    // creates a TLS socket
    var tls = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: true,
        ca: 'insert PEM-formatted cert here' // certificate pinning
    });

**A note on node-webkit and electron**:

Hybrid native platforms like NW.js (née node-webkit) and electron will be identified via `typeof process !== 'undefined'`. AMD is not supported for these platforms.

**A note on TLS**: Native TLS support is flaky throughout the platforms. If you want to use TLS on a platform that does not natively provide it, we fall back to [forge](https://github.com/digitalbazaar/forge) for TLS, and you must provide a certificate for pinning! Please consult the [forge project page](https://github.com/digitalbazaar/forge) for examples how to make forge available in your application and/or have a look at the example in this repository.

The following platforms support TLS natively:

* node.js
* Desktop Chrome Apps on Chrome M38+ with TLS connection (native tls is broken for STARTTLS :( )
* Windows StreamSocket

The following implementations use forge as a TLS shim:

* WebSockets
* Chrome Apps with STARTTLS and Mobile Chrome Apps built with [cca](https://github.com/MobileChromeApps/mobile-chrome-apps) (chrome.sockets.tcp.secure is broken)

**Use of web workers**: If you are on a platform where we fall back to forge for TLS, we can spin up a Web Worker to handle the TLS-related computation. To do this, you need to **browserify** `tcp-socket-tls-worker.js`. Please keep in mind that `forge.min.js` and the browserified version of `tcp-socket-tls-worker.js` **must** in the same folder! If you use a different path relative to your html file, you can provide it this file when you fire up the socket. **If tlsWorkerPath is undefined, no Web Worker will be started and the TLS-relatid computation will happen on the main thread!**

    // creates a TLS socket with a specific TLS worker path
    var tls = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: true,
        tlsWorkerPath: 'relative/path/to/tcp-socket-tls-worker.js'
    });

On a platform where we fall back to forge for TLS, you can either supply the socket with a certificate, or use a trust-on-first-use based approach, where the socket is accepted in the first try and you will receive a callback with the certificate. Use this certificate in subsequent interactions with this host. Host authenticity is evaluated based on their Common Name (or SubjectAltNames) and the certificate's public key fingerprint.

    var tls = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: true
    });

    tls.oncert = function(pemEncodedCertificate) {
        // do something useful with the certificate, e.g.
        // store it and reuse it on a trust-on-first-use basis
    };

Here's how the TLS socket will behave when presented with a server certificate:

* If the server does not present a certificate, it rejects the connection
* If the server presents a certificate with wrong/missing CN and/or wrong/missing SANs, it rejects the connection
* If no certificate was pinned, it calls .oncert() with the pem-encoded certificate and accepts the connection
* If a certificate was pinned, but the server presents another certificate (according to the public key fingerprint), it calls .oncert() to inform you about changes, but rejects the connection
* If a certificate was pinned and the server certificate's public key fingerprint matches the pinned certificate, the connection is accepted. .oncert will **not** be called in this case!

**A note on STARTTLS**: `upgrateToSecure()` will return immediately. If the TLS negotiation fails, the socket will throw an error and close. The socket buffers writes that occur in the meantime and writes the data out altogether when the TLS handshake is done. If said behavior is a problem in your protocol, please open an issue and/or submit a PR.

For everything else, see the [Mozilla TCPSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/TCPSocket).

**A note on WebSockets**: Run the websocket proxy (socket.io + express) to use TCPSocket straight from the browser.

WebSocket shim adds a new configuration object `ws` to TCPSocket.open

  * **url** is the url for the WebSocket proxy server (defaults to '/')
  * **options** are [Socket.io options](http://socket.io/docs/client-api/#io(url:string,-opts:object):socket)

    var socket = TCPSocket.open('127.0.0.1', 9000, {
        ...
        ws: {
            url: 'http://localhost:8889',
            options: {
                upgrade: false
            }
        }
    });

To run WebSocket integration tests that connect to `imap.gmail.com:993` run

    NODE_ENV=integration node ws-proxy/server.js

Parallel to that, run

    grunt connect:dev

and open [http://localhost:12345/test/integration/ws/integration.html](http://localhost:12345/test/integration/ws/integration.html) in your browser.

WebSocket integration tests can be run via `grunt ws-integration-test`. They are disabled by default because these do not run correctly under PhantomJS.

To run the integration tests in Chrome:

1) Install `test/integration/chrome/certificate.crt` to your Chrome certificate storage (On Mac OS, that's the keychain)
2) Add `test/integration/chrome` as a packaged app
3) Run `node test/integration/chrome/server.js`
4) Start the Chrome App.

# Unavailable API

The following API is not available with this shim:

* #listen
* #resume
* #suspend

## Installation

### [npm](https://www.npmjs.org/):

    npm install --save tcp-socket

    or directly from github
    npm install --save https://github.com/whiteout-io/tcp-socket/tarball/<TAG_NAME>

# License

This library is licensed under the MIT license.

    Copyright (c) 2014 Whiteout Networks

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.

This library uses crypto primitives from [forge](https://github.com/digitalbazaar/forge) by [Digital Bazaar, Inc.](https://github.com/digitalbazaar) which is licensed under BSD and GPL.
