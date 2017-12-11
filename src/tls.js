import { tls, pki } from 'node-forge'

export default class TlsClient {
  constructor () {
    this.open = false
    this._outboundBuffer = []

    this._tls = tls.createConnection({
      server: false,
      verify: (connection, verified, depth, certs) => {
        if (!(certs && certs[0])) {
          return false
        }

        if (!this.verifyCertificate(certs[0], this._host)) {
          return false
        }

        /*
         * Please see the readme for an explanation of the behavior without a native TLS stack!
         */

        // without a pinned certificate, we'll just accept the connection and notify the upper layer
        if (!this._ca) {
          // notify the upper layer of the new cert
          this.tlscert(pki.certificateToPem(certs[0]))
          // succeed only if this.tlscert is implemented (otherwise forge catches the error)
          return true
        }

        // if we have a pinned certificate, things get a little more complicated:
        // - leaf certificates pin the host directly, e.g. for self-signed certificates
        // - we also allow intermediate certificates, for providers that are able to sign their own certs.

        // detect if this is a certificate used for signing by testing if the common name different from the hostname.
        // also, an intermediate cert has no SANs, at least none that match the hostname.
        if (!this.verifyCertificate(this._ca, this._host)) {
          // verify certificate through a valid certificate chain
          return this._ca.verify(certs[0])
        }

        // verify certificate through host certificate pinning
        var fpPinned = pki.getPublicKeyFingerprint(this._ca.publicKey, {
          encoding: 'hex'
        })
        var fpRemote = pki.getPublicKeyFingerprint(certs[0].publicKey, {
          encoding: 'hex'
        })

        // check if cert fingerprints match
        if (fpPinned === fpRemote) {
          return true
        }

        // notify the upper layer of the new cert
        this.tlscert(pki.certificateToPem(certs[0]))
        // fail when fingerprint does not match
        return false
      },
      connected: (connection) => {
        if (!connection) {
          this.tlserror('Unable to connect')
          this.tlsclose()
          return
        }

        // tls connection open
        this.open = true

        this.tlsopen()

        // empty the buffer
        while (this._outboundBuffer.length) {
          this.prepareOutbound(this._outboundBuffer.shift())
        }
      },
      tlsDataReady: (connection) => this.tlsoutbound(s2a(connection.tlsData.getBytes())),
      dataReady: (connection) => this.tlsinbound(s2a(connection.data.getBytes())),
      closed: () => this.tlsclose(),
      error: (connection, error) => {
        this.tlserror(error.message)
        this.tlsclose()
      }
    })
  }

  configure (options) {
    this._host = options.host
    if (options.ca) {
      this._ca = pki.certificateFromPem(options.ca)
    }
  }

  prepareOutbound (buffer) {
    if (!this.open) {
      this._outboundBuffer.push(buffer)
      return
    }

    this._tls.prepare(a2s(buffer))
  }

  processInbound (buffer) {
    this._tls.process(a2s(buffer))
  }

  handshake () {
    this._tls.handshake()
  }

  /**
   * Verifies a host name by the Common Name or Subject Alternative Names
   * Expose as a method of TlsClient for testing purposes
   *
   * @param {Object} cert A forge certificate object
   * @param {String} host The host name, e.g. imap.gmail.com
   * @return {Boolean} true, if host name matches certificate, otherwise false
   */
  verifyCertificate (cert, host) {
    let entries

    const subjectAltName = cert.getExtension({
      name: 'subjectAltName'
    })

    const cn = cert.subject.getField('CN')

    // If subjectAltName is present then it must be used and Common Name must be discarded
    // http://tools.ietf.org/html/rfc2818#section-3.1
    // So we check subjectAltName first and if it does not exist then revert back to Common Name
    if (subjectAltName && subjectAltName.altNames && subjectAltName.altNames.length) {
      entries = subjectAltName.altNames.map(function (entry) {
        return entry.value
      })
    } else if (cn && cn.value) {
      entries = [cn.value]
    } else {
      return false
    }

    // find matches for hostname and if any are found return true, otherwise returns false
    return !!entries.filter(sanEntry => this.compareServername(host.toLowerCase(), sanEntry.toLowerCase())).length
  }

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
  compareServername (servername = '', sanEntry = '') {
    // if the entry name does not include a wildcard, then expect exact match
    if (sanEntry.substr(0, 2) !== '*.') {
      return sanEntry === servername
    }

    // otherwise ignore the first subdomain
    return servername.split('.').slice(1).join('.') === sanEntry.substr(2)
  }
}

const a2s = arr => String.fromCharCode.apply(null, new Uint8Array(arr))
const s2a = str => new Uint8Array(str.split('').map(char => char.charCodeAt(0))).buffer
