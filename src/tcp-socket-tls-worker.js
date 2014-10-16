// Copyright (c) 2014 Whiteout Networks

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

(function() {
    'use strict';

    //
    // Events
    //
    var EVENT_INBOUND = 'inbound',
        EVENT_OUTBOUND = 'outbound',
        EVENT_OPEN = 'open',
        EVENT_CLOSE = 'close',
        EVENT_ERROR = 'error',
        EVENT_CONFIG = 'configure',
        EVENT_CERT = 'cert',
        EVENT_HANDSHAKE = 'handshake';

    // import forge
    importScripts('forge.min.js');

    // require the TLS handler
    var TLS = require('./tcp-socket-tls');

    var tls = new TLS();
    tls.tlserror = tlserror;
    tls.tlscert = tlscert;
    tls.tlsclose = tlsclose;
    tls.tlsopen = tlsopen;
    tls.tlsoutbound = tlsoutbound;
    tls.tlsinbound = tlsinbound;

    self.onmessage = function(e) {
        var event = e.data.event,
            message = e.data.message;

        switch (event) {
            case EVENT_INBOUND:
                tls.processInbound(message);
                break;
            case EVENT_OUTBOUND:
                tls.prepareOutbound(message);
                break;
            case EVENT_HANDSHAKE:
                tls.handshake();
                break;
            case EVENT_CONFIG:
                tls.configure(message);
                break;
        }
    };

    function tlscert(cert) {
        self.postMessage(createMessage(EVENT_CERT, cert));
    }

    function tlserror(message) {
        self.postMessage(createMessage(EVENT_ERROR, message));
    }

    function tlsclose() {
        self.postMessage(createMessage(EVENT_CLOSE));
    }

    function tlsopen() {
        self.postMessage(createMessage(EVENT_OPEN));
    }

    function tlsoutbound(buffer) {
        self.postMessage(createMessage(EVENT_OUTBOUND, buffer), [buffer]);
    }

    function tlsinbound(buffer) {
        self.postMessage(createMessage(EVENT_INBOUND, buffer), [buffer]);
    }

    // Helper function

    function createMessage(event, message) {
        return {
            event: event,
            message: message
        };
    }
})();