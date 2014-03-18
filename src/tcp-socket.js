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

(function(parent, forge) {
    'use strict';

    parent.TCPSocket = parent.TCPSocket || parent.mozTCPSocket;

    if (parent.TCPSocket && typeof parent.TCPSocket === "object") {
        // TCPSocket is already defined
        return;
    }

    /**
     * TCPSocket constructor. Invoked indirectly via TCPSocket.open
     */
    var TCPSocket = function(config) {
        var self = this;

        config.options.useSSL = (typeof config.options.useSSL !== 'undefined') ? config.options.useSSL : false;
        config.options.binaryType = config.options.binaryType || 'arraybuffer';

        // public flags
        self.host = config.host;
        self.port = config.port;
        self.ssl = config.options.useSSL;
        self.bufferedAmount = 0;
        self.readyState = 'connecting';
        self.binaryType = config.options.binaryType;

        // internal flags
        self._stopReading = false;
        self._socketId = 0;
        self._isBinary = self.binaryType === 'arraybuffer';

        if (self.ssl) {
            if (!config.options.ca) {
                throw 'No pinned certificate present, TLS verification is broken!';
            }

            self._ca = forge.pki.certificateFromPem(config.options.ca);
            self._tlsClient = forge.tls.createConnection({
                server: false,
                verify: function(connection, verified, depth, certs) {
                    if (self._ca) {
                        // verify certificate through pinning
                        return self._ca.verify(certs[0]);
                    }

                    // no pinning...
                    throw 'No pinned certificate present, TLS verification is broken!';
                },
                connected: function(connection) {
                    if (!connection) {
                        self._emit('error', new Error('Unable to connect'));
                        self.close();
                        return;
                    }

                    self.readyState = 'open';
                    self._emit('open');
                },
                tlsDataReady: function(connection) {
                    // encrypted data ready to written to the socket

                    var data = connection.tlsData.getBytes(); // encrypted data
                    data = s2a(data); // chrome socket needs array buffers
                    self._send(data); // send the arraybuffer
                },
                dataReady: function(connection) {
                    // encrypted data received from the socket is decrypted

                    var data = connection.data.getBytes();
                    if (self._isBinary) {
                        data = s2a(data);
                    }
                    self._emit('data', data);
                },
                closed: function() {
                    self.close();
                },
                error: function(connection, error) {
                    self._emit('error', error);
                    self.close();
                }
            });

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

                if (self.ssl) {
                    // the socket is up, do the tls handshake
                    self._tlsClient.handshake();
                } else {
                    // socket is up and running
                    self.readyState = 'open';
                    self._emit('open');
                }

                // let's start reading
                read.bind(self)();

                return;
            });
        });
    };

    TCPSocket.listen = TCPSocket.prototype.resume = TCPSocket.prototype.suspend = TCPSocket.prototype.upgradeToSecure = function() {
        throw 'API not supported';
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
            var data = readInfo.data;

            if (self.ssl) {
                // feed the data to the tls socket
                data = a2s(data);
                self._tlsClient.process(data);
            } else {
                // emit data event
                data = self._isBinary ? data : a2s(data);
                self._emit('data', data);
            }
            read.bind(self)(); // start the next read
        });
    };

    //
    // API
    //

    TCPSocket.open = function(host, port, options) {
        return new TCPSocket({
            host: host,
            port: port,
            options: options || {}
        });
    };

    TCPSocket.prototype.close = function() {
        this.readyState = 'closing';
        this._emit('close');
        if (this._socketId !== 0) {
            chrome.socket.disconnect(this._socketId);
            chrome.socket.destroy(this._socketId);
            this._socketId = 0;
        }
        this.readyState = 'closed';
    };

    TCPSocket.prototype.send = function(data) {
        if (this.ssl) {
            data = this._isBinary ? a2s(data) : data; // forge needs string
            this._tlsClient.prepare(data); // give data to forge to be prepared for tls
            return;
        }

        data = this._isBinary ? data : s2a(data); // chrome socket needs array buffers
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

    // Internal use

    TCPSocket.prototype._emit = function(type, data) {
        var cb;
        if (type === 'open') {
            cb = this.onopen;
        } else if (type === 'error') {
            cb = this.onerror;
        } else if (type === 'data') {
            cb = this.ondata;
        } else if (type === 'drain') {
            cb = this.ondrain;
        } else if (type === 'close') {
            cb = this.onclose;
        }

        if (typeof cb === 'undefined') {
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

    // array buffer -> singlebyte string
    function a2s(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    // singlebyte string -> array buffer
    function s2a(str) {
        var view = new Uint8Array(str.length);
        for (var i = 0, j = str.length; i < j; i++) {
            view[i] = str.charCodeAt(i);
        }
        return view.buffer;
    }

    parent.TCPSocket = TCPSocket;
})(navigator, forge);