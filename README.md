tcp-socket
==========

[![npm](https://img.shields.io/npm/v/emailjs-tcp-socket.svg)]()[![Greenkeeper badge](https://badges.greenkeeper.io/emailjs/emailjs-tcp-socket.svg)](https://greenkeeper.io/) [![Build Status](https://travis-ci.org/emailjs/emailjs-tcp-socket.svg?branch=master)](https://travis-ci.org/emailjs/emailjs-tcp-socket) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)  [![ES6+](https://camo.githubusercontent.com/567e52200713e0f0c05a5238d91e1d096292b338/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f65732d362b2d627269676874677265656e2e737667)](https://kangax.github.io/compat-table/es6/)

This shim brings [Mozilla-flavored](https://developer.mozilla.org/en-US/docs/WebAPI/TCP_Socket) version of the [Raw Socket API](http://www.w3.org/TR/raw-sockets/) to node.js, Chromium apps, Windows 10 UWP apps, and websockets (via socket.io).

NB: Chrome Apps are going away, hence the Chrome socket implementation can be regarded as obsolete.

https://github.com/emailjs/emailjs-imap-client/issues/158
https://blog.chromium.org/2016/08/from-chrome-apps-to-web.html
https://github.com/MobileChromeApps/mobile-chrome-apps/issues/269

# Usage

```
npm install --save emailjs-tcp-socket
```

```javascript
import TCPSocket from 'emailjs-tcp-socket'
```

See also the [Mozilla TCPSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/TCPSocket).

## #open

```javascript
var tcpSocket = TCPSocket.open('127.0.0.1', 8000);
var tlsSocket = TCPSocket.open('127.0.0.1', 9000, {
  useSecureTransport: true,
  ca: 'PEM-formatted X.509 TLS Cert'
});
```

A call to `TCPSocket.open` expects host and port, followed by further socket options:

* useSecureTransport: `true` for TLS encryption, `false` for plaintext sockets. Defaults to `false`.
* ca: Enables certificate pinning for platforms without native TLS implementations. Expects a PEM-encoded X.509 TLS certificate as a string.

## #upgradeToSecure()

Established a secure channel via TLS. The upgradeToSecure method allows turning a TCP non secured connection into a secured one. `upgradeToSecure()` will return immediately. If the TLS negotiation fails, the socket will throw an error and close. The socket buffers writes that occur in the meantime and writes the data out altogether when the TLS handshake is done. If this behavior is a problem in your protocol, please open an issue and/or submit a PR.

**A note on native TLS**: Native TLS support is varying throughout the platforms. If you want to use TLS on a platform that does not natively provide it, we fall back to [forge](https://github.com/digitalbazaar/forge) for TLS, and you must provide a certificate for pinning!

The following platforms support TLS natively:

* node.js and related (e.g. Electron)
* Desktop Chrome Apps on Chrome M38+ with TLS connection (not STARTTLS!)
* Windows StreamSocket

The following implementations use forge as a TLS shim:

* WebSockets
* Chrome Apps with STARTTLS and Mobile Chrome Apps built with [cca](https://github.com/MobileChromeApps/mobile-chrome-apps) (chrome.sockets.tcp.secure is broken)

On a platform where we fall back to forge for TLS, you can either supply the socket with a certificate, or use a trust-on-first-use based approach, where the socket is accepted in the first try and you will receive a callback with the certificate. Use this certificate in subsequent interactions with this host. Host authenticity is evaluated based on their Common Name (or SubjectAltNames) and the certificate's public key fingerprint.

```javascript
var tls = navigator.TCPSocket.open('127.0.0.1', 9000, { useSecureTransport: true })
tls.oncert = pemEncodedCertificate => {} // do something useful with the certificate, e.g. store it and reuse it on a trust-on-first-use basis
```

Here's how the TLS shim will behave when presented with a server certificate:

* If the server does not present a certificate, it rejects the connection
* If the server presents a certificate with wrong/missing CN and/or wrong/missing SANs, it rejects the connection
* If no certificate was pinned, it calls .oncert() with the pem-encoded certificate and accepts the connection
* If a certificate was pinned, but the server presents another certificate (according to the public key fingerprint), it calls .oncert() to inform you about changes, but rejects the connection
* If a certificate was pinned and the server certificate's public key fingerprint matches the pinned certificate, the connection is accepted. .oncert will **not** be called in this case!

Please note that we can not synchronously ask whether that certificate is ok or not, since the TLS shim runs in a Web Worker.

## #close()

```javascript
socket.close()
```

Closes the connection, invokes `.onclose` when socket is closed.

## #send(data)

```javascript
socket.send(data)
```

Send an ArrayBuffer across the network. Backpressure is handled in the actual underlying socket implementations.

## Events

```javascript
socket.onopen = () => {} // A handler for the open event. After this event, the socket is ready to send and receive data.
socket.ondrain = () => {} // A handler for the drain event. This event is triggered each time the buffer of data is flushed.
socket.onerror = (error) => {} // A handler for the error event.
socket.ondata = (arraybuffer) => {} // A handler for the data event. This event is triggered each time data has been received.
socket.onclose = () => {} // A handler for the close event.
```

## Web Sockets

Run the websocket proxy (socket.io + express) to use TCPSocket straight from the browser. Please note that there is a good reason for TCP sockets to not be avaiable in the open web. Handle this with extreme care. The WebSocket shim adds a new configuration object `ws` to `TCPSocket.open`

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
})
```

# Unavailable API

The following API is not available with this shim:

* #listen
* #resume
* #suspend

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
