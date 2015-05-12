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

                if (!self.verifyCertificate(certs[0], self._host)) {
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
                if (!self.verifyCertificate(self._ca, self._host)) {
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
     * Expose as a method of TlsClient for testing purposes
     *
     * @param {Object} cert A forge certificate object
     * @param {String} host The host name, e.g. imap.gmail.com
     * @return {Boolean} true, if host name matches certificate, otherwise false
     */
    TlsClient.prototype.verifyCertificate = function(cert, host) {
        var cn, subjectAltName, entries, self = this;

        subjectAltName = cert.getExtension({
            name: 'subjectAltName'
        });

        cn = cert.subject.getField('CN');

        // If subjectAltName is present then it must be used and Common Name must be discarded
        // http://tools.ietf.org/html/rfc2818#section-3.1
        // So we check subjectAltName first and if it does not exist then revert back to Common Name
        if (subjectAltName && subjectAltName.altNames && subjectAltName.altNames.length) {
            entries = subjectAltName.altNames.map(function(entry) {
                return entry.value;
            });
        } else if (cn && cn.value) {
            entries = [cn.value];
        } else {
            return false;
        }

        // find matches for hostname and if any are found return true, otherwise returns false
        return !!entries.filter(function(sanEntry) {
            return self.compareServername(host, sanEntry);
        }).length;
    };

    /**
     * Compares servername with a subjectAltName entry. Returns true if these values match.
     *
     * Wildcard usage in certificate hostnames is very limited, the only valid usage
     * form is "*.domain" and not "*sub.domain" or "sub.*.domain" so we only have to check
     * if the entry starts with "*." when comparing against a wildcard hostname. If "*" is used
     * in invalid places, then treat it as a string and not as a wildcard.
     *
     * @param {String} servername Hostname to check
     * @param {String} sanEntry subjectAltName entry to check against
     * @returns {Boolean} Returns true if hostname matches entry from SAN
     */
    TlsClient.prototype.compareServername = function(servername, sanEntry) {
        // normalize input values
        servername = (servername || '').toString().toLowerCase();
        sanEntry = (sanEntry || '').toString().toLowerCase();

        // if the entry name does not include a wildcard, then expect exact match
        if (sanEntry.substr(0, 2) !== '*.') {
            return sanEntry === servername;
        }

        // otherwise ignore the first subdomain
        return servername.split('.').slice(1).join('.') === sanEntry.substr(2);
    };

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