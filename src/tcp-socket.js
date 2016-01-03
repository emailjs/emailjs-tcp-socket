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

(function(root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // amd
        define(['tcp-socket-tls'], factory.bind(null, navigator));
    } else if (typeof exports === 'object' && typeof navigator !== 'undefined') {
        if (process.versions.electron || process.versions.nw || process.versions['node-webkit']) {
            // common.js for electron
            module.exports = factory(navigator, null, require('net'), require('tls'));
        } else {
            // common.js for browserify apps with native socket support
            module.exports = factory(navigator, require('./tcp-socket-tls'));
        }
    } else if (typeof exports === 'object') {
        // common.js for node.js
        module.exports = factory(null, null, require('net'), require('tls'));
    } else {
        // global browser import
        navigator.TCPSocket = factory(navigator, root.TLS);
    }
})(this, function(root, TLS, net, tls) {
    'use strict';

    // Constants used for tls-worker
    var EVENT_INBOUND = 'inbound',
        EVENT_OUTBOUND = 'outbound',
        EVENT_OPEN = 'open',
        EVENT_CLOSE = 'close',
        EVENT_ERROR = 'error',
        EVENT_CONFIG = 'configure',
        EVENT_CERT = 'cert',
        EVENT_HANDSHAKE = 'handshake';

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

    if (net && tls) {
        // node.js -> use native net/tls impl
        nodeShim();
    } else if (typeof chrome !== 'undefined' && (chrome.socket || chrome.sockets)) {
        // chrome packaged app using chrome.socket
        chromeShim();
    } else if (typeof Windows === 'object' && Windows && Windows.Networking &&
        Windows.Networking.Sockets && Windows.Networking.Sockets.StreamSocket) {
        // Windows app using SocketStream
        winShim();
    } else if (typeof window === 'object' && typeof io === 'function') {
        // websocket proxy
        wsShim();
    }

    function winShim() {

        TCPSocket = function(config) {
            var self = this;

            config.options.useSecureTransport = (typeof config.options.useSecureTransport !== 'undefined') ? config.options.useSecureTransport : false;
            config.options.binaryType = config.options.binaryType || 'arraybuffer';

            // public flags
            self.host = new Windows.Networking.HostName(config.host); // NB! HostName constructor will throw on invalid input
            self.port = config.port;
            self.ssl = config.options.useSecureTransport;
            self.bufferedAmount = 0;
            self.readyState = 'connecting';
            self.binaryType = config.options.binaryType;

            if (self.binaryType !== 'arraybuffer') {
                throw new Error('Only arraybuffers are supported!');
            }

            self._socket = new Windows.Networking.Sockets.StreamSocket();

            self._socket.control.keepAlive = true;
            self._socket.control.noDelay = true;

            self._dataReader = null;
            self._dataWriter = null;

            // set to true if upgrading with STARTTLS
            self._upgrading = false;

            // cache all client.send calls to this array if currently upgrading
            self._upgradeCache = [];

            // initial socket type. default is 'plainSocket' (no encryption applied)
            // 'tls12' supports the TLS 1.2, TLS 1.1 and TLS 1.0 protocols but no SSL
            self._protectionLevel = Windows.Networking.Sockets.SocketProtectionLevel[self.ssl ? 'tls12' : 'plainSocket'];

            // Initiate connection to destination
            self._socket.
            connectAsync(self.host, self.port, self._protectionLevel).
            done(function() {
                self._setStreamHandlers();
                self._emit('open');
            }, function(E) {
                self._emit('error', E);
            });
        };

        /**
         * Initiate Reader and Writer interfaces for the socket
         */
        TCPSocket.prototype._setStreamHandlers = function() {
            var self = this;

            // setup reader
            self._dataReader = new Windows.Storage.Streams.DataReader(self._socket.inputStream);
            self._dataReader.inputStreamOptions = Windows.Storage.Streams.InputStreamOptions.partial;

            // setup writer
            self._dataWriter = new Windows.Storage.Streams.DataWriter(self._socket.outputStream);

            // start byte reader loop
            self._read();
        };

        /**
         * Emit an error and close socket
         *
         * @param {Error} error Error object
         */
        TCPSocket.prototype._errorHandler = function(error) {
            var self = this;

            // we ignore errors after close has been called, since all aborted operations
            // will emit their error handlers
            // this will also apply to starttls as a read call is aborted before upgrading the socket
            if (self._upgrading || (self.readyState !== 'closing' && self.readyState !== 'closed')) {
                self._emit('error', error);
                self.close();
            }
        };

        /**
         * Read available bytes from the socket. This method is recursive  once it ends, it restarts itself
         */
        TCPSocket.prototype._read = function() {
            var self = this;

            if (self._upgrading || (self.readyState !== 'open' && self.readyState !== 'connecting')) {
                return; // do nothing if socket not open
            }

            // Read up to 4096 bytes from the socket. This is not a fixed number (the mode was set
            // with inputStreamOptions.partial property), so it might return with a smaller
            // amount of bytes.
            self._dataReader.loadAsync(4096).done(function(availableByteCount) {

                if (!availableByteCount) {
                    // no bytes available for reading, restart the reading process
                    return setImmediate(self._read.bind(self));
                }

                // we need an Uint8Array that gets filled with the bytes from the buffer
                var data = new Uint8Array(availableByteCount);
                self._dataReader.readBytes(data); // data argument gets filled with the bytes

                self._emit('data', data.buffer);

                // restart reading process
                return setImmediate(self._read.bind(self));
            }, function(E) {
                self._errorHandler(E);
            });
        };

        //
        // API
        //

        TCPSocket.prototype.close = function() {
            var self = this;
            self.readyState = 'closing';

            try {
                self._socket.close();
            } catch (E) {
                self._emit('error', E);
            }

            setImmediate(self._emit.bind(self, 'close'));
        };

        TCPSocket.prototype.send = function(data) {
            var self = this;

            if (this.readyState !== 'open') {
                return;
            }

            if (self._upgrading) {
                self._upgradeCache.push(data);
                return;
            }

            // Write bytes to buffer
            this._dataWriter.writeBytes(data.buffer && data || new Uint8Array(data));

            // Emit buffer contents
            self._dataWriter.storeAsync().done(function() {
                self._emit('drain');
            }, function(E) {
                self._errorHandler(E);
            });
        };

        TCPSocket.prototype.upgradeToSecure = function() {
            var self = this;

            if (self.ssl || self._upgrading) {
                // nothing to do here
                return;
            }

            self._upgrading = true;
            try {
                // release current input stream. this is required to allow socket upgrade
                // write stream is not released as all send calls are cached from this point onwards
                // and not passed to socket until the socket is upgraded
                this._dataReader.detachStream();
            } catch (E) {}

            // update protection level
            self._protectionLevel = Windows.Networking.Sockets.SocketProtectionLevel.tls12;

            self._socket.upgradeToSslAsync(self._protectionLevel, self.host).done(
                function() {
                    var data;

                    self._upgrading = false;
                    self.ssl = true; // secured connection from now on

                    self._dataReader = new Windows.Storage.Streams.DataReader(self._socket.inputStream);
                    self._dataReader.inputStreamOptions = Windows.Storage.Streams.InputStreamOptions.partial;
                    self._read();

                    // emit all cached requests
                    while (self._upgradeCache.length) {
                        data = self._upgradeCache.shift();
                        self.send(data);
                    }
                },
                function(E) {
                    self._upgrading = false;
                    self._errorHandler(E);
                }
            );
        };
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
                // Ignore ECONNRESET errors. For the app this is the same as normal close
                if (error.code !== 'ECONNRESET') {
                    self._emit('error', error);
                }
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
    }

    function chromeShim() {
        TCPSocket = function(config) {
            var self = this;

            config.options.useSecureTransport = (typeof config.options.useSecureTransport !== 'undefined') ? config.options.useSecureTransport : false;
            config.options.binaryType = config.options.binaryType || 'arraybuffer';

            // public flags
            self.host = config.host;
            self.port = config.port;
            self.ssl = false;
            self.bufferedAmount = 0;
            self.readyState = 'connecting';
            self.binaryType = config.options.binaryType;

            if (self.binaryType !== 'arraybuffer') {
                throw new Error('Only arraybuffers are supported!');
            }

            // internal flags
            self._socketId = 0;
            self._ca = config.options.ca;
            self._useTLS = config.options.useSecureTransport;
            self._useSTARTTLS = false;
            self._tlsWorkerPath = config.options.tlsWorkerPath;
            self._useLegacySocket = false;
            self._useForgeTls = false;

            // handles writes during starttls handshake, chrome socket only
            self._startTlsBuffer = [];
            self._startTlsHandshakeInProgress = false;

            chrome.runtime.getPlatformInfo(function(platformInfo) {

                //
                // FIX START
                //

                if (platformInfo.os.indexOf("cordova") !== -1) {
                    // chrome.sockets.tcp.secure is not functional on cordova
                    // https://github.com/MobileChromeApps/mobile-chrome-apps/issues/269
                    self._useLegacySocket = false;
                    self._useForgeTls = true;
                } else {
                    self._useLegacySocket = true;
                    self._useForgeTls = false;
                }

                //
                // FIX END
                //

                // fire up the socket
                if (self._useLegacySocket) {
                    self._createLegacySocket();
                } else {
                    self._createSocket();
                }
            });
        };

        /**
         * Creates a socket using the deprecated chrome.socket API
         */
        TCPSocket.prototype._createLegacySocket = function() {
            var self = this;

            chrome.socket.create('tcp', {}, function(createInfo) {
                self._socketId = createInfo.socketId;

                chrome.socket.connect(self._socketId, self.host, self.port, function(result) {
                    if (result !== 0) {
                        self.readyState = 'closed';
                        self._emit('error', new Error('Unable to connect'));
                        return;
                    }

                    self._onSocketConnected();
                });
            });
        };

        /**
         * Creates a socket using chrome.sockets.tcp
         */
        TCPSocket.prototype._createSocket = function() {
            var self = this;

            chrome.sockets.tcp.create({}, function(createInfo) {
                self._socketId = createInfo.socketId;

                // register for data events on the socket before connecting
                chrome.sockets.tcp.onReceive.addListener(function(readInfo) {
                    if (readInfo.socketId === self._socketId) {
                        // process the data available on the socket
                        self._onData(readInfo.data);
                    }
                });

                // register for data error on the socket before connecting
                chrome.sockets.tcp.onReceiveError.addListener(function(readInfo) {
                    if (readInfo.socketId === self._socketId) {
                        // socket closed remotely or broken
                        self.close();
                    }
                });

                chrome.sockets.tcp.setPaused(self._socketId, true, function() {
                    chrome.sockets.tcp.connect(self._socketId, self.host, self.port, function(result) {
                        if (result < 0) {
                            self.readyState = 'closed';
                            self._emit('error', new Error('Unable to connect'));
                            return;
                        }

                        self._onSocketConnected();
                    });
                });
            });
        };

        /**
         * Invoked once a socket has been connected:
         * - Kicks off TLS handshake, if necessary
         * - Starts reading from legacy socket, if necessary
         */
        TCPSocket.prototype._onSocketConnected = function() {
            var self = this;

            if (!self._useTLS) {
                return read();
            }

            // do an immediate TLS handshake if self._useTLS === true
            self._upgradeToSecure(function() {
                read();
            });

            function read() {
                if (self._useLegacySocket) {
                    // the tls handshake is done let's start reading from the legacy socket
                    self._readLegacySocket();
                    self._emit('open');
                } else {
                    chrome.sockets.tcp.setPaused(self._socketId, false, function() {
                        self._emit('open');
                    });
                }
            }
        };

        /**
         * Handles the rough edges for differences between chrome.socket and chrome.sockets.tcp
         * for upgrading to a TLS connection with or without forge
         */
        TCPSocket.prototype._upgradeToSecure = function(callback) {
            var self = this;

            callback = callback || function() {};

            if (!self._useLegacySocket && self.readyState !== 'open') {
                // use chrome.sockets.tcp.secure for TLS, not for STARTTLS!
                // use forge only for STARTTLS
                self._useForgeTls = false;
                chrome.sockets.tcp.secure(self._socketId, onUpgraded);
            } else if (self._useLegacySocket) {
                chrome.socket.secure(self._socketId, onUpgraded);
            } else if (self._useForgeTls) {
                // setup the forge tls client or webworker as tls fallback
                createTls.bind(self)();
                callback();
            }

            // invoked after chrome.socket.secure or chrome.sockets.tcp.secure have been upgraded
            function onUpgraded(tlsResult) {
                if (tlsResult !== 0) {
                    self._emit('error', new Error('TLS handshake failed. Reason: ' + chrome.runtime.lastError));
                    self.close();
                    return;
                }

                self.ssl = true;

                // empty the buffer
                while (self._startTlsBuffer.length) {
                    self.send(self._startTlsBuffer.shift());
                }

                callback();
            }
        };

        TCPSocket.prototype.upgradeToSecure = function() {
            var self = this;

            if (self.ssl || self._useSTARTTLS) {
                return;
            }

            self._useSTARTTLS = true;
            self._upgradeToSecure(function() {
                if (self._useLegacySocket) {
                    self._readLegacySocket(); // tls handshake is done, restart reading
                }
            });
        };

        /**
         * Reads from a legacy chrome.socket.
         */
        TCPSocket.prototype._readLegacySocket = function() {
            var self = this;

            if (self._socketId === 0) {
                // the socket is closed. omit read and stop further reads
                return;
            }

            // don't read from chrome.socket if we have chrome.socket.secure a handshake in progress!
            if ((self._useSTARTTLS || self._useTLS) && !self.ssl) {
                return;
            }

            chrome.socket.read(self._socketId, function(readInfo) {
                // socket closed remotely or broken
                if (readInfo.resultCode <= 0) {
                    self._socketId = 0;
                    self.close();
                    return;
                }

                // process the data available on the socket
                self._onData(readInfo.data);

                // queue the next read
                self._readLegacySocket();
            });
        };

        /**
         * Invoked when data has been read from the socket. Handles cases when to feed
         * the data available on the socket to forge.
         *
         * @param {ArrayBuffer} buffer The binary data read from the socket
         */
        TCPSocket.prototype._onData = function(buffer) {
            var self = this;

            if ((self._useTLS || self._useSTARTTLS) && self._useForgeTls) {
                // feed the data to the tls client
                if (self._tlsWorker) {
                    self._tlsWorker.postMessage(createMessage(EVENT_INBOUND, buffer), [buffer]);
                } else {
                    self._tls.processInbound(buffer);
                }
            } else {
                // emit data event
                self._emit('data', buffer);
            }
        };

        /**
         * Closes the socket
         * @return {[type]} [description]
         */
        TCPSocket.prototype.close = function() {
            this.readyState = 'closing';

            if (this._socketId !== 0) {
                if (this._useLegacySocket) {
                    // close legacy socket
                    chrome.socket.disconnect(this._socketId);
                    chrome.socket.destroy(this._socketId);
                } else {
                    // close socket
                    chrome.sockets.tcp.disconnect(this._socketId);
                }

                this._socketId = 0;
            }

            // terminate the tls worker
            if (this._tlsWorker) {
                this._tlsWorker.terminate();
                this._tlsWorker = undefined;
            }

            this._emit('close');
        };

        TCPSocket.prototype.send = function(buffer) {
            if (!this._useForgeTls && this._useSTARTTLS && !this.ssl) {
                // buffer the unprepared data until chrome.socket(s.tcp) handshake is done
                this._startTlsBuffer.push(buffer);
            } else if (this._useForgeTls && (this._useTLS || this._useSTARTTLS)) {
                // give buffer to forge to be prepared for tls
                if (this._tlsWorker) {
                    this._tlsWorker.postMessage(createMessage(EVENT_OUTBOUND, buffer), [buffer]);
                } else {
                    this._tls.prepareOutbound(buffer);
                }
            } else {
                // send the arraybuffer
                this._send(buffer);
            }
        };

        TCPSocket.prototype._send = function(data) {
            var self = this;

            if (self._socketId === 0) {
                // the socket is closed.
                return;
            }

            if (self._useLegacySocket) {
                chrome.socket.write(self._socketId, data, function(writeInfo) {
                    if (writeInfo.bytesWritten < 0 && self._socketId !== 0) {
                        // if the socket is already 0, it has already been closed. no need to alert then...
                        self._emit('error', new Error('Could not write ' + data.byteLength + ' bytes to socket ' + self._socketId + '. Chrome error code: ' + writeInfo.bytesWritten));
                        self._socketId = 0;
                        self.close();

                        return;
                    }

                    self._emit('drain');
                });
            } else {
                chrome.sockets.tcp.send(self._socketId, data, function(sendInfo) {
                    if (sendInfo.bytesSent < 0 && self._socketId !== 0) {
                        // if the socket is already 0, it has already been closed. no need to alert then...
                        self._emit('error', new Error('Could not write ' + data.byteLength + ' bytes to socket ' + self._socketId + '. Chrome error code: ' + sendInfo.bytesSent));
                        self.close();

                        return;
                    }

                    self._emit('drain');
                });
            }
        };
    }

    function wsShim() {
        TCPSocket = function(config) {
            var self = this;

            config.options.useSecureTransport = (typeof config.options.useSecureTransport !== 'undefined') ? config.options.useSecureTransport : false;
            config.options.binaryType = config.options.binaryType || 'arraybuffer';

            // public flags
            self.host = config.host;
            self.port = config.port;
            self.ssl = false;
            self.bufferedAmount = 0;
            self.readyState = 'connecting';
            self.binaryType = config.options.binaryType;

            if (self.binaryType !== 'arraybuffer') {
                throw new Error('Only arraybuffers are supported!');
            }

            // internal flags
            self._ca = config.options.ca;
            self._useTLS = config.options.useSecureTransport;
            self._useSTARTTLS = false;
            self._tlsWorkerPath = config.options.tlsWorkerPath;

            self._wsHost = (config.options.ws && config.options.ws.url) || window.location.origin;
            self._wsOptions = (config.options.ws && config.options.ws.options) || {};
            self._wsOptions.reconnection = self._wsOptions.reconnection || false;
            self._wsOptions.multiplex = self._wsOptions.multiplex || false;

            self._socket = io(self._wsHost, self._wsOptions);
            self._socket.emit('open', {
                host: self.host,
                port: self.port
            }, function(proxyHostname) {
                self._proxyHostname = proxyHostname;
                if (self._useTLS) {
                    // the socket is up, do the tls handshake
                    createTls.bind(self)();
                } else {
                    // socket is up and running
                    self._emit('open', {
                        proxyHostname: self._proxyHostname
                    });
                }

                self._socket.on('data', function(buffer) {
                    if (self._useTLS || self._useSTARTTLS) {
                        // feed the data to the tls socket
                        if (self._tlsWorker) {
                            self._tlsWorker.postMessage(createMessage(EVENT_INBOUND, buffer), [buffer]);
                        } else {
                            self._tls.processInbound(buffer);
                        }
                    } else {
                        // emit data event
                        self._emit('data', buffer);
                    }
                });

                self._socket.on('error', function(message) {
                    self._emit('error', new Error(message));
                    self.close();
                });

                self._socket.on('close', function() {
                    self.close();
                });
            });
        };

        //
        // API
        //

        TCPSocket.prototype.close = function() {
            this.readyState = 'closing';

            this._socket.emit('end');
            this._socket.disconnect();

            if (this._tlsWorker) {
                this._tlsWorker.terminate();
            }

            this._emit('close');
        };

        TCPSocket.prototype.send = function(buffer) {
            if (this._useTLS || this._useSTARTTLS) {
                // give buffer to forge to be prepared for tls
                if (this._tlsWorker) {
                    this._tlsWorker.postMessage(createMessage(EVENT_OUTBOUND, buffer), [buffer]);
                } else {
                    this._tls.prepareOutbound(buffer);
                }
                return;
            }

            // send the arraybuffer
            this._send(buffer);
        };

        TCPSocket.prototype._send = function(data) {
            var self = this;
            self._socket.emit('data', data, function() {
                self._emit('drain');
            });
        };

        TCPSocket.prototype.upgradeToSecure = function() {
            if (this.ssl || this._useSTARTTLS) {
                return;
            }

            this._useSTARTTLS = true;

            // setup the forge tls client or webworker
            createTls.bind(this)();
        };
    }

    //
    // TLS shim event handlers, unused when native TLS
    //

    TCPSocket.prototype.tlscert = function(cert) {
        this.oncert(cert);
    };

    TCPSocket.prototype.tlserror = function(message) {
        this._emit('error', new Error(message));
        this.close();
    };

    TCPSocket.prototype.tlsclose = function() {
        this.close();
    };

    TCPSocket.prototype.tlsopen = function() {
        this.ssl = true;
        if (this._useTLS) {
            if (this._proxyHostname) {
                this._emit('open', {
                    proxyHostname: this._proxyHostname
                });
            } else {
                this._emit('open');
            }
        }
    };

    TCPSocket.prototype.tlsoutbound = function(buffer) {
        this._send(buffer);
    };

    TCPSocket.prototype.tlsinbound = function(buffer) {
        this._emit('data', buffer);
    };


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


    //
    //
    // Internal use
    //
    //

    // utility function, to be bound to the respective websocket & chrome.socket shim TCPSocket object
    var createTls = function() {
        // create the respective TLS shim
        if (window.Worker && typeof this._tlsWorkerPath === 'string') {
            createTlsWorker.bind(this)();
        } else {
            // setup the forge tls client
            createTlsNoWorker.bind(this)();
        }
    };

    // utility function, to be bound to the TCPSocket object
    // creates an instance of the tls shim (no worker)
    var createTlsNoWorker = function() {
        // create the tls client
        this._tls = new TLS();

        // attach the handlers
        this._tls.tlserror = this.tlserror.bind(this);
        this._tls.tlscert = this.tlscert.bind(this);
        this._tls.tlsclose = this.tlsclose.bind(this);
        this._tls.tlsopen = this.tlsopen.bind(this);
        this._tls.tlsoutbound = this.tlsoutbound.bind(this);
        this._tls.tlsinbound = this.tlsinbound.bind(this);

        // configure the tls client
        this._tls.configure({
            host: this.host,
            ca: this._ca
        });

        // start the handshake
        this._tls.handshake();
    };

    // utility function, to be bound to the TCPSocket object
    // creates an instance of the tls shim running in a web worker
    var createTlsWorker = function() {
        var self = this,
            workerPath = self._tlsWorkerPath;

        self._tlsWorker = new Worker(workerPath);
        self._tlsWorker.onmessage = function(e) {
            var event = e.data.event,
                message = e.data.message;

            switch (event) {
                case EVENT_CERT:
                    self.tlscert(message);
                    break;

                case EVENT_ERROR:
                    self.tlserror(message);
                    break;

                case EVENT_CLOSE:
                    self.tlsclose(message);
                    break;

                case EVENT_OPEN:
                    self.tlsopen(message);
                    break;

                case EVENT_OUTBOUND:
                    self.tlsoutbound(message);
                    break;

                case EVENT_INBOUND:
                    self.tlsinbound(message);
                    break;
            }
        };

        self._tlsWorker.onerror = function(e) {
            var error = new Error('Error handling web worker: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message);
            console.error(error);
            self.tlserror(error.message);
        };

        // start the worker and configure the tls client
        self._tlsWorker.postMessage(createMessage(EVENT_CONFIG, {
            host: self.host,
            ca: self._ca
        }));

        // start the handshake
        self._tlsWorker.postMessage(createMessage(EVENT_HANDSHAKE));
    };

    function createMessage(event, message) {
        return {
            event: event,
            message: message
        };
    }

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

    if (root) {
        // add TCPSocket to root object
        root.TCPSocket = TCPSocket;
    }

    return TCPSocket;
});
