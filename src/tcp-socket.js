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

(function(factory) {
    'use strict';

    if (typeof define === 'function' && define.amd && typeof nodeRequire === 'undefined') {
        // amd under chrome packaged app
        define(['forge'], factory.bind(null, navigator));
    } else if (typeof define === 'function' && define.amd && typeof nodeRequire !== 'undefined') {
        // amd under node-webkit
        define([], factory.bind(null, navigator, null, nodeRequire('net'), nodeRequire('tls')));
    } else if (typeof exports === 'object') {
        // node.js
        module.exports = factory(null, null, require('net'), require('tls'));
    } else {
        // global browser import
        navigator.TCPSocket = factory(navigator, forge);
    }
}(function(root, forge, net, tls) {
    'use strict';

    // the class to be implemented
    var TCPSocket = function() {
        throw new Error('Runtime does not offer TCPSockets!');
    };

    // detect runtime
    if (root && typeof io === 'undefined') {
        // check for native support
        root.TCPSocket = root.TCPSocket || root.mozTCPSocket;

        if (root.TCPSocket && typeof root.TCPSocket === "object") {
            // TCPSocket is already defined
            return root.TCPSocket;
        }
    }

    if (typeof chrome !== 'undefined' && chrome.socket) {
        // chrome packaged app
        chromeShim();
    } else if (net && tls) {
        // node.js -> use native net/tls impl
        nodeShim();
    } else if (typeof window === 'object' && typeof io === 'function') {
        // websocket proxy
        wsShim();
    }

    function nodeShim() {

        TCPSocket = function(config) {
            var self = this,
                netApi;

            config.options.useSecureTransport = (typeof config.options.useSecureTransport !== 'undefined') ? config.options.useSecureTransport : false;
            config.options.binaryType = config.options.binaryType || 'arraybuffer';

            // public flags
            self.host = config.host;
            self.port = config.port;
            self.ssl = config.options.useSecureTransport;
            self.bufferedAmount = 0;
            self.readyState = 'connecting';
            self.binaryType = config.options.binaryType;

            if (self.binaryType !== 'arraybuffer') {
                throw new Error('Only arraybuffers are supported!');
            }

            netApi = (self.ssl) ? tls : net;
            self._socket = netApi.connect(self.port, self.host, self._emit.bind(self, 'open'));

            // add all event listeners to the new socket
            self._attachListeners();
        };

        TCPSocket.prototype._attachListeners = function() {
            var self = this;

            self._socket.on('data', function(nodeBuf) {
                // convert node buffer to array buffer or string
                self._emit('data', toArrayBuffer(nodeBuf));
            });

            self._socket.on('error', function(error) {
                self._emit('error', error);
                self.close();
            });

            self._socket.on('end', self._emit.bind(self, 'close'));
        };

        TCPSocket.prototype._removeListeners = function() {
            this._socket.removeAllListeners('data');
            this._socket.removeAllListeners('end');
            this._socket.removeAllListeners('error');
        };

        //
        // API
        //

        TCPSocket.prototype.close = function() {
            this.readyState = 'closing';
            this._socket.end();
        };

        TCPSocket.prototype.send = function(data) {
            // convert data to string or node buffer
            this._socket.write(toBuffer(data), this._emit.bind(this, 'drain'));
        };

        TCPSocket.prototype.upgradeToSecure = function() {
            var self = this;

            if (self.ssl) {
                return;
            }

            // remove all event listeners from the old socket
            self._removeListeners();

            // replace the old socket with a shiny new tls socket
            self._socket = tls.connect({
                socket: self._socket
            }, function() {
                self.ssl = true;
            });

            // add all event listeners to the new socket
            self._attachListeners();
        };

    } // end of nodeShim

    function chromeShim() {

        /**
         * TCPSocket constructor. Invoked indirectly via TCPSocket.open
         */
        TCPSocket = function(config) {
            var self = this;

            config.options.useSecureTransport = (typeof config.options.useSecureTransport !== 'undefined') ? config.options.useSecureTransport : false;
            config.options.binaryType = config.options.binaryType || 'arraybuffer';

            // public flags
            self.host = config.host;
            self.port = config.port;
            self.ssl = config.options.useSecureTransport;
            self.bufferedAmount = 0;
            self.readyState = 'connecting';
            self.binaryType = config.options.binaryType;

            // handles writes during starttls handshake
            self._startTlsBuffer = [];
            self._startTlsHandshakeInProgress = false;

            if (self.binaryType !== 'arraybuffer') {
                throw new Error('Only arraybuffers are supported!');
            }

            // internal flags
            self._stopReading = false;
            self._socketId = 0;

            // setup forge as fallback if native TLS is unavailable
            if (!chrome.socket.secure) {
                // pin the tls certificate, if present
                if (config.options.ca) {
                    self._ca = forge.pki.certificateFromPem(config.options.ca);
                }

                // setup the forge tls client
                if (self.ssl) {
                    self._tlsClient = createTlsClient.bind(self)();
                }
            }

            // connect the socket
            chrome.socket.create('tcp', {}, function(createInfo) {
                self._socketId = createInfo.socketId;

                chrome.socket.connect(self._socketId, self.host, self.port, function(result) {
                    if (result !== 0) {
                        self.readyState = 'closed';
                        self._emit('error', new Error('Unable to connect'));
                        return;
                    }

                    if (self.ssl && chrome.socket.secure) {
                        // use native TLS stack if available
                        chrome.socket.secure(self._socketId, {}, function(tlsResult) {
                            if (tlsResult !== 0) {
                                self._emit('error', new Error('TLS handshake failed'));
                                self.close();
                                return;
                            }

                            // socket is up and running
                            self._emit('open');
                            // let's start reading
                            read.bind(self)();
                        });

                    } else if (self.ssl) {
                        // use forge for TLS as fallback
                        self._tlsClient.handshake();
                        // let's start reading
                        read.bind(self)();
                    } else {
                        // socket is up and running
                        self._emit('open');
                        // let's start reading
                        read.bind(self)();
                    }
                });
            });
        };

        var read = function() {
            var self = this;

            if (self._socketId === 0) {
                // the socket is closed. omit read and stop further reads
                return;
            }

            chrome.socket.read(self._socketId, function(readInfo) {
                // socket closed remotely or broken
                if (readInfo.resultCode <= 0) {
                    self._socketId = 0;
                    self.close();
                    return;
                }

                // data is available
                if ((self.ssl || self._startTlsHandshakeInProgress) && !chrome.socket.secure) {
                    // feed the data to the tls socket
                    self._tlsClient.process(a2s(readInfo.data));
                } else {
                    // emit data event
                    self._emit('data', readInfo.data);
                }
                read.bind(self)(); // start the next read
            });
        };

        //
        // API
        //

        TCPSocket.prototype.close = function() {
            this.readyState = 'closing';
            if (this._socketId !== 0) {
                chrome.socket.disconnect(this._socketId);
                chrome.socket.destroy(this._socketId);
                this._socketId = 0;
            }
            this._emit('close');
        };

        TCPSocket.prototype.upgradeToSecure = function() {
            var self = this;

            if (self.ssl || self._startTlsHandshakeInProgress) {
                return;
            }

            self._startTlsHandshakeInProgress = true;

            if (chrome.socket.secure) {
                chrome.socket.secure(self._socketId, {}, function(tlsResult) {
                    if (tlsResult !== 0) {
                        self._emit('error', new Error('TLS handshake failed'));
                        self.close();
                        return;
                    }

                    self._startTlsHandshakeInProgress = false;
                    self.ssl = true;

                    // empty the buffer
                    while (self._startTlsBuffer.length) {
                        self.send(self._startTlsBuffer.shift());
                    }

                    // let's start reading
                    read.bind(self)();
                });
            } else {
                self._tlsClient = createTlsClient.bind(self)();
                self._tlsClient.handshake();
            }
        };

        TCPSocket.prototype.send = function(data) {
            if (this._startTlsHandshakeInProgress) {
                this._startTlsBuffer.push(data);
                return;
            }

            if (this.ssl && !chrome.socket.secure) {
                this._tlsClient.prepare(a2s(data)); // give data to forge to be prepared for tls
                return;
            }

            this._send(data); // send the arraybuffer
        };

        TCPSocket.prototype._send = function(data) {
            var self = this;

            if (self._socketId === 0) {
                // the socket is closed.
                return;
            }

            chrome.socket.write(self._socketId, data, function(writeInfo) {
                if (writeInfo.bytesWritten < 0 && self._socketId !== 0) {
                    // if the socket is already 0, it has already been closed. no need to alert then...
                    self._emit('error', new Error('Could not write to socket ' + self._socketId + '. Chrome error code: ' + writeInfo.bytesWritten));
                    self._socketId = 0;
                    self.close();

                    return;
                }

                self._emit('drain');
            });
        };

    } // end of chromeShim

    function wsShim() {

        var _socket;

        /**
         * TCPSocket constructor. Invoked indirectly via TCPSocket.open
         */
        TCPSocket = function(config) {
            var self = this;

            config.options.useSecureTransport = (typeof config.options.useSecureTransport !== 'undefined') ? config.options.useSecureTransport : false;
            config.options.binaryType = config.options.binaryType || 'arraybuffer';

            // public flags
            self.host = config.host;
            self.port = config.port;
            self.ssl = config.options.useSecureTransport;
            self.bufferedAmount = 0;
            self.readyState = 'connecting';
            self.binaryType = config.options.binaryType;
            self._socketId = false;

            // handles writes during starttls handshake
            self._startTlsBuffer = [];
            self._startTlsHandshakeInProgress = false;

            if (self.binaryType !== 'arraybuffer') {
                throw new Error('Only arraybuffers are supported!');
            }

            // internal flags
            self._stopReading = false;

            if (!_socket || _socket.destroyed) {
                _socket = io(
                    (config.options.ws && config.options.ws.url) || window.location.origin,
                    config.options.ws && config.options.ws.options
                );
            }

            // pin the tls certificate, if present
            if (config.options.ca) {
                self._ca = forge.pki.certificateFromPem(config.options.ca);
            }

            // setup the forge tls client
            if (self.ssl) {
                self._tlsClient = createTlsClient.bind(self)();
            }

            setTimeout(function() {
                _socket.emit('open', {
                    host: self.host,
                    port: self.port
                }, function(socketId) {
                    self._socketId = socketId;

                    if (self.ssl) {
                        // the socket is up, do the tls handshake
                        self._tlsClient.handshake();
                    } else {
                        // socket is up and running
                        self._emit('open');
                    }

                    _socket.on('data-' + self._socketId, function(chunk) {
                        if (self.ssl || self._startTlsHandshakeInProgress) {
                            // feed the data to the tls socket
                            self._tlsClient.process(a2s(chunk));
                        } else {
                            // emit data event
                            self._emit('data', chunk);
                        }
                    });

                    _socket.on('error-' + self._socketId, function(message) {
                        self._emit('error', new Error(message));
                    });

                    _socket.on('close-' + self._socketId, function() {
                        self._emit('close');
                    });
                });
            }, 0);
        };

        //
        // API
        //


        TCPSocket.prototype.close = function() {
            var self = this;
            this.readyState = 'closing';
            _socket.emit('end-' + self._socketId);
        };

        TCPSocket.prototype.send = function(data) {
            if (this._startTlsHandshakeInProgress) {
                this._startTlsBuffer.push(data);
                return;
            }

            if (this.ssl) {
                this._tlsClient.prepare(a2s(data)); // give data to forge to be prepared for tls
                return;
            }

            this._send(data); // send the arraybuffer
        };

        TCPSocket.prototype._send = function(data) {
            var self = this;
            _socket.emit('data-' + self._socketId, data, function() {
                self._emit('drain');
            });
        };

        TCPSocket.prototype.upgradeToSecure = function() {
            if (this.ssl || this._startTlsHandshakeInProgress) {
                return;
            }

            this._startTlsHandshakeInProgress = true;
            this._tlsClient = createTlsClient.bind(this)();
            this._tlsClient.handshake();
        };
    } // end of wsShim

    //
    // Common API
    //

    TCPSocket.open = function(host, port, options) {
        return new TCPSocket({
            host: host,
            port: port,
            options: options || {}
        });
    };

    TCPSocket.listen = TCPSocket.listen || apiNotSupported;
    TCPSocket.prototype.resume = TCPSocket.prototype.resume || apiNotSupported;
    TCPSocket.prototype.suspend = TCPSocket.prototype.suspend || apiNotSupported;
    TCPSocket.prototype.upgradeToSecure = TCPSocket.prototype.upgradeToSecure || apiNotSupported;


    function apiNotSupported() {
        throw new Error('API not supported');
    }

    // Internal use

    TCPSocket.prototype._emit = function(type, data) {
        var cb;
        if (type === 'open') {
            this.readyState = 'open';
            cb = this.onopen;
        } else if (type === 'error') {
            cb = this.onerror;
        } else if (type === 'data') {
            cb = this.ondata;
        } else if (type === 'drain') {
            cb = this.ondrain;
        } else if (type === 'close') {
            this.readyState = 'closed';
            cb = this.onclose;
        }

        if (typeof cb !== 'function') {
            return;
        }

        cb({
            target: this,
            type: type,
            data: data
        });
    };

    //
    // Helper functions
    //

    var createTlsClient = function() {
        var self = this;

        return forge.tls.createConnection({
            server: false,
            verify: function(connection, verified, depth, certs) {
                if (!(certs && certs[0])) {
                    return false;
                }

                if (!verifyCertificate(certs[0], self.host)) {
                    return false;
                }

                /*
                 * Please see the readme for an explanation of the behavior without a native TLS stack!
                 */

                // without a pinned certificate, we'll just accept the connection and notify the upper layer
                if (!self._ca) {
                    // notify the upper layer of the new cert
                    self.oncert(forge.pki.certificateToPem(certs[0]));
                    // succeed only if self.oncert is implemented (otherwise forge catches the error)
                    return true;
                }

                // if we have a pinned certificate, things get a little more complicated:
                // - leaf certificates pin the host directly, e.g. for self-signed certificates
                // - we also allow intermediate certificates, for providers that are able to sign their own certs.

                // detect if this is a certificate used for signing by testing if the common name different from the hostname.
                // also, an intermediate cert has no SANs, at least none that match the hostname.
                if (!verifyCertificate(self._ca, self.host)) {
                    // verify certificate through a valid certificate chain
                    return self._ca.verify(certs[0]);
                }

                // verify certificate through host certificate pinning
                var fpPinned = forge.pki.getPublicKeyFingerprint(self._ca.publicKey, {
                    encoding: 'hex'
                });
                var fpRemote = forge.pki.getPublicKeyFingerprint(certs[0].publicKey, {
                    encoding: 'hex'
                });

                // check if cert fingerprints match
                if (fpPinned === fpRemote) {
                    return true;
                }

                // notify the upper layer of the new cert
                self.oncert(forge.pki.certificateToPem(certs[0]));
                // fail when fingerprint does not match
                return false;

            },
            connected: function(connection) {
                if (!connection) {
                    self._emit('error', new Error('Unable to connect'));
                    self.close();
                    return;
                }

                if (!self._startTlsHandshakeInProgress) {
                    // regular tls handshake done, nothing else to do here
                    self._emit('open');
                    return;
                }

                // starttls handshake done, empty the write buffer, don't send another "open" event
                self._startTlsHandshakeInProgress = false;
                self.ssl = true;

                // empty the buffer
                while (self._startTlsBuffer.length) {
                    self.send(self._startTlsBuffer.shift());
                }
            },
            tlsDataReady: function(connection) {
                // encrypted data ready to written to the socket
                self._send(s2a(connection.tlsData.getBytes())); // send encrypted data
            },
            dataReady: function(connection) {
                // encrypted data received from the socket is decrypted
                self._emit('data', s2a(connection.data.getBytes()));
            },
            closed: function() {
                self.close();
            },
            error: function(connection, error) {
                self._emit('error', error);
                self.close();
            }
        });
    };

    /**
     * Verifies a host name by the Common Name or Subject Alternative Names
     *
     * @param {Object} cert A forge certificate object
     * @param {String} host The host name, e.g. imap.gmail.com
     * @return {Boolean} true, if host name matches certificate, otherwise false
     */
    function verifyCertificate(cert, host) {
        var cn, cnRegex, subjectAltName, sanRegex;

        cn = cert.subject.getField('CN');
        if (cn && cn.value) {
            cnRegex = new RegExp(cn.value.replace(/\./g, '\\.').replace(/\*/g, '.*'), 'i');
            if (cnRegex.test(host)) {
                return true;
            }
        }

        subjectAltName = cert.getExtension({
            name: 'subjectAltName'
        });

        if (!(subjectAltName && subjectAltName.altNames)) {
            return false;
        }

        for (var i = subjectAltName.altNames.length - 1; i >= 0; i--) {
            if (subjectAltName.altNames[i] && subjectAltName.altNames[i].value) {
                sanRegex = new RegExp(subjectAltName.altNames[i].value.replace(/\./g, '\\.').replace(/\*/g, '.*'), 'i');
                if (sanRegex.test(host)) {
                    return true;
                }
            }
        }

        return false;
    }

    // array buffer -> singlebyte string
    function a2s(buf) {
        var view = new Uint8Array(buf),
            str = '';
        for (var i = 0, j = view.length; i < j; i++) {
            str += String.fromCharCode(view[i]);
        }
        return str;
    }

    // singlebyte string -> array buffer
    function s2a(str) {
        var view = new Uint8Array(str.length);
        for (var i = 0, j = str.length; i < j; i++) {
            view[i] = str.charCodeAt(i);
        }
        return view.buffer;
    }

    // node buffer -> array buffer
    function toArrayBuffer(buffer) {
        var view = new Uint8Array(buffer.length);
        for (var i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return view.buffer;
    }

    // array buffer -> node buffer
    function toBuffer(ab) {
        return new Buffer(new Uint8Array(ab));
    }

    if (root) {
        // add TCPSocket to root object
        root.TCPSocket = TCPSocket;
    }

    return TCPSocket;
}));
