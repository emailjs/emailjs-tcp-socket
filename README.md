This shim brings [Mozilla-flavored](https://developer.mozilla.org/en-US/docs/WebAPI/TCP_Socket) version of the [Raw Socket API](http://www.w3.org/TR/raw-sockets/) to Chromium. Its purpose is to enable apps to use the same codebase in Firefox OS, Chrome OS, and Chrome Packaged Apps...

Feel free to you include in your [Chrome Packaged App](http://developer.chrome.com/extensions/apps)!

# Usage

An example can be found in ```example/```:

    1) cd example && node server.js
    2) add the example-folder as a chrome app (chrome settings -> extensions -> check 'developer mode' -> load unpacked extension)
    3) launch the extension
    4) have fun with navigator.TCPSocket

Include ```tcp-socket.js``` and ```forge``` in your markup. It will attach itself to the navigator object.
    
    <script src="forge.min.js"></script>
    <script src="tcp-socket.js"></script>

    // creates a TCP socket
    var tcp = navigator.TCPSocket.open('127.0.0.1', 8000);

    // creates a TLS socket
    var tls = navigator.TCPSocket.open('127.0.0.1', 9000, {
        useSSL: true,
        ca: 'insert PEM-formatted cert here'
    });

**A note on TLS**: [Native TLS is not yet available for chrome.socket.](https://code.google.com/p/chromium/issues/detail?id=132896). For this reason, we cannot tap into the browser's native SSL certificates. If you want to use TLS, you must provide a certificate for pinning! This shim depends on [forge](https://github.com/digitalbazaar/forge) for TLS. Please consult the [forge project page](https://github.com/digitalbazaar/forge) for examples how to make forge available in your application and/or have a look at the eample in this repository.

For everything else, see the [Mozilla TCPSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/TCPSocket).

# Unavailable API

The following API is not available with this shim:

* #listen
* #resume
* #suspend
* #upgradeToSecure

# Install

    // hot and fresh from the master
    npm install --save https://github.com/whiteout-io/tcp-socket/tarball/0.1.0

# License

This library is licensed under the MIT license.

    The MIT License (MIT)

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
