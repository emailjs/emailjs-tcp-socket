tcp-socket
==========

This shim brings [Mozilla-flavored](https://developer.mozilla.org/en-US/docs/WebAPI/TCP_Socket) version of the [Raw Socket API](http://www.w3.org/TR/raw-sockets/) to node.js, Chromium apps, and websockets (via socket.io). Its purpose is to enable apps to use the same codebase in Firefox OS, Chrome OS, and on the server.

[![Build Status](https://travis-ci.org/whiteout-io/tcp-socket.svg?branch=dev/umd)](https://travis-ci.org/whiteout-io/tcp-socket)

Feel free to include in your [Chrome App](http://developer.chrome.com/extensions/apps)!

# Usage

Include ```tcp-socket.js``` and ```forge``` in your markup. It will attach itself to the navigator object.

    <script src="forge.min.js"></script>
    <script src="tcp-socket.js"></script>

    // creates a TCP socket
    var tcp = navigator.TCPSocket.open('127.0.0.1', 8000);

    // creates a TLS socket
    var tls = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: true,
        ca: 'insert PEM-formatted cert here' // certificate pinning
    });

**A note on node-webkit**:
It is not that easy to figure out if you want to assume a browser or node environment on hybrid platforms like node-webkit. This gets even harder if you use require.js, too. There is one simple workaround, though:

    window.nodeRequire = window.require

If you remember the node.js require as a global in node-webkit, we can safely call the native node.js TCP API.

**A note on TLS**: [Native TLS is not yet available for chrome.socket.](https://code.google.com/p/chromium/issues/detail?id=132896). For this reason, we cannot tap into the browser's native SSL certificates. If you want to use TLS, you must provide a certificate for pinning! This shim depends on [forge](https://github.com/digitalbazaar/forge) for TLS. Please consult the [forge project page](https://github.com/digitalbazaar/forge) for examples how to make forge available in your application and/or have a look at the example in this repository.

**Use of web workers**: If you are on a platform where we fall back to forge for TLS, we spin up a Web Worker to handle the TLS-related computation. Please keep in mind that `forge.min.js`, `tcp-socket-tls-worker.js`, and `tcp-socket-tls.js` **must** in the same folder! The configuration for `tlsWorkerPath` defaults to `'./tcp-socket-tls-worker.js'`. If you use a different path relative to your html file, you can provide it this when you fire up the socket.

    // creates a TLS socket with a specific TLS worker path
    var tls = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSecureTransport: true,
        tlsWorkerPath: 'relative/path/to/tcp-socket-tls-worker.js'
    });

You can either supply the socket with a certificate, or use a trust-on-first-use based approach, where the socket is accepted in the first try and you will receive a callback with the certificate. Use this certificate in subsequent interactions with this host. Host authenticity is evaluated based on their Common Name (or SubjectAltNames) and the certificate's public key fingerprint.

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

**A note on STARTTLS**: `upgrateToSecure()` will return immediately. If the TLS negotiation fails, the socket will throw an error and close. The socket buffers writes that occur in the meantime and writes the data out altogether when the TLS handshake is done. If said behavior is a problem in your protocol, please open an issue and/or submit a PR. Also, STARTTLS is **experimental** in Chrome Apps on Chrome 38+, where chrome.socket.secure() is available.

For everything else, see the [Mozilla TCPSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/TCPSocket).

**A note on WebSockets**: Run the websocket proxy (socket.io + express) to use TCPSocket straight from the browser.

WebSocket shim adds a new configuration object `ws` to TCPSocket.open

  * **url** is the url for the WebSocket proxy server (defaults to '/')
  * **options** are [Socket.io options](http://socket.io/docs/client-api/#io(url:string,-opts:object):socket)

```javascript
var socket = TCPSocket.open('127.0.0.1', 9000, {
    ...
    ws: {
        url: 'http://localhost:8889',
        options: {
            upgrade: false
        }
    }
});
```

To run WebSocket integration tests run

    NODE_ENV=integration node ws-proxy/server.js

And then run

    grunt ws-integration-test

or open [integration.html](test/integration/ws/integration.html) in your browser.

WebSocket integration tests are disabled by default because these do not run correctly under PhantomJS

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
