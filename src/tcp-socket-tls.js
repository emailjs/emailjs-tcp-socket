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
        // amd under chrome packaged app
        define(['forge'], factory);
    } else if (typeof exports === 'object' && typeof navigator !== 'undefined') {
        // common.js for browser apps with native socket support
        // fallback to forge browser global
        module.exports = factory(forge);
    } else {
        // global browser import
        root.TLS = factory(root.forge);
    }
}(this, function(forge) {
    'use strict';

    var TlsClient = function() {
        var self = this;

        self.open = false;
        self._outboundBuffer = [];

        self._tls = forge.tls.createConnection({
            server: false,
            verify: function(connection, verified, depth, certs) {
                if (!(certs && certs[0])) {
                    return false;
                }

                if (!verifyCertificate(certs[0], self._host)) {
                    return false;
                }

                /*
                 * Please see the readme for an explanation of the behavior without a native TLS stack!
                 */

                // without a pinned certificate, we'll just accept the connection and notify the upper layer
                if (!self._ca) {
                    // notify the upper layer of the new cert
                    self.tlscert(forge.pki.certificateToPem(certs[0]));
                    // succeed only if self.tlscert is implemented (otherwise forge catches the error)
                    return true;
                }

                // if we have a pinned certificate, things get a little more complicated:
                // - leaf certificates pin the host directly, e.g. for self-signed certificates
                // - we also allow intermediate certificates, for providers that are able to sign their own certs.

                // detect if this is a certificate used for signing by testing if the common name different from the hostname.
                // also, an intermediate cert has no SANs, at least none that match the hostname.
                if (!verifyCertificate(self._ca, self._host)) {
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
                self.tlscert(forge.pki.certificateToPem(certs[0]));
                // fail when fingerprint does not match
                return false;

            },
            connected: function(connection) {
                if (!connection) {
                    self.tlserror('Unable to connect');
                    self.tlsclose();
                    return;
                }

                // tls connection open
                self.open = true;

                self.tlsopen();

                // empty the buffer
                while (self._outboundBuffer.length) {
                    self.prepareOutbound(self._outboundBuffer.shift());
                }
            },
            tlsDataReady: function(connection) {
                // encrypted data ready to be written to the socket
                self.tlsoutbound(s2a(connection.tlsData.getBytes()));
            },
            dataReady: function(connection) {
                // encrypted data received from the socket is decrypted
                self.tlsinbound(s2a(connection.data.getBytes()));
            },
            closed: function() {
                self.tlsclose();
            },
            error: function(connection, error) {
                self.tlserror(error.message);
                self.tlsclose();
            }
        });
    };

    TlsClient.prototype.configure = function(options) {
        this._host = options.host;
        if (options.ca) {
            this._ca = forge.pki.certificateFromPem(options.ca);
        }
    };

    TlsClient.prototype.prepareOutbound = function(buffer) {
        if (!this.open) {
            this._outboundBuffer.push(buffer);
            return;
        }

        this._tls.prepare(a2s(buffer));
    };

    TlsClient.prototype.processInbound = function(buffer) {
        this._tls.process(a2s(buffer));
    };

    TlsClient.prototype.handshake = function() {
        this._tls.handshake();
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

    return TlsClient;
}));
