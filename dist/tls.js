'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _nodeForge = require('node-forge');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TlsClient = function () {
  function TlsClient() {
    var _this = this;

    _classCallCheck(this, TlsClient);

    this.open = false;
    this._outboundBuffer = [];

    this._tls = _nodeForge.tls.createConnection({
      server: false,
      verify: function verify(connection, verified, depth, certs) {
        if (!(certs && certs[0])) {
          return false;
        }

        if (!_this.verifyCertificate(certs[0], _this._host)) {
          return false;
        }

        /*
         * Please see the readme for an explanation of the behavior without a native TLS stack!
         */

        // without a pinned certificate, we'll just accept the connection and notify the upper layer
        if (!_this._ca) {
          // notify the upper layer of the new cert
          _this.tlscert(_nodeForge.pki.certificateToPem(certs[0]));
          // succeed only if this.tlscert is implemented (otherwise forge catches the error)
          return true;
        }

        // if we have a pinned certificate, things get a little more complicated:
        // - leaf certificates pin the host directly, e.g. for self-signed certificates
        // - we also allow intermediate certificates, for providers that are able to sign their own certs.

        // detect if this is a certificate used for signing by testing if the common name different from the hostname.
        // also, an intermediate cert has no SANs, at least none that match the hostname.
        if (!_this.verifyCertificate(_this._ca, _this._host)) {
          // verify certificate through a valid certificate chain
          return _this._ca.verify(certs[0]);
        }

        // verify certificate through host certificate pinning
        var fpPinned = _nodeForge.pki.getPublicKeyFingerprint(_this._ca.publicKey, {
          encoding: 'hex'
        });
        var fpRemote = _nodeForge.pki.getPublicKeyFingerprint(certs[0].publicKey, {
          encoding: 'hex'
        });

        // check if cert fingerprints match
        if (fpPinned === fpRemote) {
          return true;
        }

        // notify the upper layer of the new cert
        _this.tlscert(_nodeForge.pki.certificateToPem(certs[0]));
        // fail when fingerprint does not match
        return false;
      },
      connected: function connected(connection) {
        if (!connection) {
          _this.tlserror('Unable to connect');
          _this.tlsclose();
          return;
        }

        // tls connection open
        _this.open = true;

        _this.tlsopen();

        // empty the buffer
        while (_this._outboundBuffer.length) {
          _this.prepareOutbound(_this._outboundBuffer.shift());
        }
      },
      tlsDataReady: function tlsDataReady(connection) {
        return _this.tlsoutbound(s2a(connection.tlsData.getBytes()));
      },
      dataReady: function dataReady(connection) {
        return _this.tlsinbound(s2a(connection.data.getBytes()));
      },
      closed: function closed() {
        return _this.tlsclose();
      },
      error: function error(connection, _error) {
        _this.tlserror(_error.message);
        _this.tlsclose();
      }
    });
  }

  _createClass(TlsClient, [{
    key: 'configure',
    value: function configure(options) {
      this._host = options.host;
      if (options.ca) {
        this._ca = _nodeForge.pki.certificateFromPem(options.ca);
      }
    }
  }, {
    key: 'prepareOutbound',
    value: function prepareOutbound(buffer) {
      if (!this.open) {
        this._outboundBuffer.push(buffer);
        return;
      }

      this._tls.prepare(a2s(buffer));
    }
  }, {
    key: 'processInbound',
    value: function processInbound(buffer) {
      this._tls.process(a2s(buffer));
    }
  }, {
    key: 'handshake',
    value: function handshake() {
      this._tls.handshake();
    }

    /**
     * Verifies a host name by the Common Name or Subject Alternative Names
     * Expose as a method of TlsClient for testing purposes
     *
     * @param {Object} cert A forge certificate object
     * @param {String} host The host name, e.g. imap.gmail.com
     * @return {Boolean} true, if host name matches certificate, otherwise false
     */

  }, {
    key: 'verifyCertificate',
    value: function verifyCertificate(cert, host) {
      var _this2 = this;

      var entries = void 0;

      var subjectAltName = cert.getExtension({
        name: 'subjectAltName'
      });

      var cn = cert.subject.getField('CN');

      // If subjectAltName is present then it must be used and Common Name must be discarded
      // http://tools.ietf.org/html/rfc2818#section-3.1
      // So we check subjectAltName first and if it does not exist then revert back to Common Name
      if (subjectAltName && subjectAltName.altNames && subjectAltName.altNames.length) {
        entries = subjectAltName.altNames.map(function (entry) {
          return entry.value;
        });
      } else if (cn && cn.value) {
        entries = [cn.value];
      } else {
        return false;
      }

      // find matches for hostname and if any are found return true, otherwise returns false
      return !!entries.filter(function (sanEntry) {
        return _this2.compareServername(host.toLowerCase(), sanEntry.toLowerCase());
      }).length;
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

  }, {
    key: 'compareServername',
    value: function compareServername() {
      var servername = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var sanEntry = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      // if the entry name does not include a wildcard, then expect exact match
      if (sanEntry.substr(0, 2) !== '*.') {
        return sanEntry === servername;
      }

      // otherwise ignore the first subdomain
      return servername.split('.').slice(1).join('.') === sanEntry.substr(2);
    }
  }]);

  return TlsClient;
}();

exports.default = TlsClient;


var a2s = function a2s(arr) {
  return String.fromCharCode.apply(null, new Uint8Array(arr));
};
var s2a = function s2a(str) {
  return new Uint8Array(str.split('').map(function (char) {
    return char.charCodeAt(0);
  })).buffer;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy90bHMuanMiXSwibmFtZXMiOlsiVGxzQ2xpZW50Iiwib3BlbiIsIl9vdXRib3VuZEJ1ZmZlciIsIl90bHMiLCJjcmVhdGVDb25uZWN0aW9uIiwic2VydmVyIiwidmVyaWZ5IiwiY29ubmVjdGlvbiIsInZlcmlmaWVkIiwiZGVwdGgiLCJjZXJ0cyIsInZlcmlmeUNlcnRpZmljYXRlIiwiX2hvc3QiLCJfY2EiLCJ0bHNjZXJ0IiwiY2VydGlmaWNhdGVUb1BlbSIsImZwUGlubmVkIiwiZ2V0UHVibGljS2V5RmluZ2VycHJpbnQiLCJwdWJsaWNLZXkiLCJlbmNvZGluZyIsImZwUmVtb3RlIiwiY29ubmVjdGVkIiwidGxzZXJyb3IiLCJ0bHNjbG9zZSIsInRsc29wZW4iLCJsZW5ndGgiLCJwcmVwYXJlT3V0Ym91bmQiLCJzaGlmdCIsInRsc0RhdGFSZWFkeSIsInRsc291dGJvdW5kIiwiczJhIiwidGxzRGF0YSIsImdldEJ5dGVzIiwiZGF0YVJlYWR5IiwidGxzaW5ib3VuZCIsImRhdGEiLCJjbG9zZWQiLCJlcnJvciIsIm1lc3NhZ2UiLCJvcHRpb25zIiwiaG9zdCIsImNhIiwiY2VydGlmaWNhdGVGcm9tUGVtIiwiYnVmZmVyIiwicHVzaCIsInByZXBhcmUiLCJhMnMiLCJwcm9jZXNzIiwiaGFuZHNoYWtlIiwiY2VydCIsImVudHJpZXMiLCJzdWJqZWN0QWx0TmFtZSIsImdldEV4dGVuc2lvbiIsIm5hbWUiLCJjbiIsInN1YmplY3QiLCJnZXRGaWVsZCIsImFsdE5hbWVzIiwibWFwIiwiZW50cnkiLCJ2YWx1ZSIsImZpbHRlciIsImNvbXBhcmVTZXJ2ZXJuYW1lIiwidG9Mb3dlckNhc2UiLCJzYW5FbnRyeSIsInNlcnZlcm5hbWUiLCJzdWJzdHIiLCJzcGxpdCIsInNsaWNlIiwiam9pbiIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsImFwcGx5IiwiVWludDhBcnJheSIsImFyciIsInN0ciIsImNoYXIiLCJjaGFyQ29kZUF0Il0sIm1hcHBpbmdzIjoi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Q1YsUUFBUVcsTUFBUixDQUFlO0FBQUEsZUFBWSxPQUFLQyxpQkFBTCxDQUF1QnRCLEtBQUt1QixXQUFMLEVBQXZCLEVBQTJDQyxTQUFTRCxXQUFULEVBQTNDLENBQVo7QUFBQSxPQUFmLEVBQStGdEMsTUFBeEc7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O3dDQVltRDtBQUFBLFVBQWhDd0MsVUFBZ0MsdUVBQW5CLEVBQW1CO0FBQUEsVUFBZkQsUUFBZSx1RUFBSixFQUFJOztBQUNqRDtBQUNBLFVBQUlBLFNBQVNFLE1BQVQsQ0FBZ0IsQ0FBaEIsRUFBbUIsQ0FBbkIsTUFBMEIsSUFBOUIsRUFBb0M7QUFDbEMsZUFBT0YsYUFBYUMsVUFBcEI7QUFDRDs7QUFFRDtBQUNBLGFBQU9BLFdBQVdFLEtBQVgsQ0FBaUIsR0FBakIsRUFBc0JDLEtBQXRCLENBQTRCLENBQTVCLEVBQStCQyxJQUEvQixDQUFvQyxHQUFwQyxNQUE2Q0wsU0FBU0UsTUFBVCxDQUFnQixDQUFoQixDQUFwRDtBQUNEOzs7Ozs7a0JBbEtrQmxFLFM7OztBQXFLckIsSUFBTThDLE1BQU0sU0FBTkEsR0FBTTtBQUFBLFNBQU93QixPQUFPQyxZQUFQLENBQW9CQyxLQUFwQixDQUEwQixJQUExQixFQUFnQyxJQUFJQyxVQUFKLENBQWVDLEdBQWYsQ0FBaEMsQ0FBUDtBQUFBLENBQVo7QUFDQSxJQUFNNUMsTUFBTSxTQUFOQSxHQUFNO0FBQUEsU0FBTyxJQUFJMkMsVUFBSixDQUFlRSxJQUFJUixLQUFKLENBQVUsRUFBVixFQUFjVCxHQUFkLENBQWtCO0FBQUEsV0FBUWtCLEtBQUtDLFVBQUwsQ0FBZ0IsQ0FBaEIsQ0FBUjtBQUFBLEdBQWxCLENBQWYsRUFBOERsQyxNQUFyRTtBQUFBLENBQVoiLCJmaWxlIjoidGxzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdGxzLCBwa2kgfSBmcm9tICdub2RlLWZvcmdlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUbHNDbGllbnQge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5vcGVuID0gZmFsc2VcbiAgICB0aGlzLl9vdXRib3VuZEJ1ZmZlciA9IFtdXG5cbiAgICB0aGlzLl90bHMgPSB0bHMuY3JlYXRlQ29ubmVjdGlvbih7XG4gICAgICBzZXJ2ZXI6IGZhbHNlLFxuICAgICAgdmVyaWZ5OiAoY29ubmVjdGlvbiwgdmVyaWZpZWQsIGRlcHRoLCBjZXJ0cykgPT4ge1xuICAgICAgICBpZiAoIShjZXJ0cyAmJiBjZXJ0c1swXSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy52ZXJpZnlDZXJ0aWZpY2F0ZShjZXJ0c1swXSwgdGhpcy5faG9zdCkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIC8qXG4gICAgICAgICAqIFBsZWFzZSBzZWUgdGhlIHJlYWRtZSBmb3IgYW4gZXhwbGFuYXRpb24gb2YgdGhlIGJlaGF2aW9yIHdpdGhvdXQgYSBuYXRpdmUgVExTIHN0YWNrIVxuICAgICAgICAgKi9cblxuICAgICAgICAvLyB3aXRob3V0IGEgcGlubmVkIGNlcnRpZmljYXRlLCB3ZSdsbCBqdXN0IGFjY2VwdCB0aGUgY29ubmVjdGlvbiBhbmQgbm90aWZ5IHRoZSB1cHBlciBsYXllclxuICAgICAgICBpZiAoIXRoaXMuX2NhKSB7XG4gICAgICAgICAgLy8gbm90aWZ5IHRoZSB1cHBlciBsYXllciBvZiB0aGUgbmV3IGNlcnRcbiAgICAgICAgICB0aGlzLnRsc2NlcnQocGtpLmNlcnRpZmljYXRlVG9QZW0oY2VydHNbMF0pKVxuICAgICAgICAgIC8vIHN1Y2NlZWQgb25seSBpZiB0aGlzLnRsc2NlcnQgaXMgaW1wbGVtZW50ZWQgKG90aGVyd2lzZSBmb3JnZSBjYXRjaGVzIHRoZSBlcnJvcilcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIHBpbm5lZCBjZXJ0aWZpY2F0ZSwgdGhpbmdzIGdldCBhIGxpdHRsZSBtb3JlIGNvbXBsaWNhdGVkOlxuICAgICAgICAvLyAtIGxlYWYgY2VydGlmaWNhdGVzIHBpbiB0aGUgaG9zdCBkaXJlY3RseSwgZS5nLiBmb3Igc2VsZi1zaWduZWQgY2VydGlmaWNhdGVzXG4gICAgICAgIC8vIC0gd2UgYWxzbyBhbGxvdyBpbnRlcm1lZGlhdGUgY2VydGlmaWNhdGVzLCBmb3IgcHJvdmlkZXJzIHRoYXQgYXJlIGFibGUgdG8gc2lnbiB0aGVpciBvd24gY2VydHMuXG5cbiAgICAgICAgLy8gZGV0ZWN0IGlmIHRoaXMgaXMgYSBjZXJ0aWZpY2F0ZSB1c2VkIGZvciBzaWduaW5nIGJ5IHRlc3RpbmcgaWYgdGhlIGNvbW1vbiBuYW1lIGRpZmZlcmVudCBmcm9tIHRoZSBob3N0bmFtZS5cbiAgICAgICAgLy8gYWxzbywgYW4gaW50ZXJtZWRpYXRlIGNlcnQgaGFzIG5vIFNBTnMsIGF0IGxlYXN0IG5vbmUgdGhhdCBtYXRjaCB0aGUgaG9zdG5hbWUuXG4gICAgICAgIGlmICghdGhpcy52ZXJpZnlDZXJ0aWZpY2F0ZSh0aGlzLl9jYSwgdGhpcy5faG9zdCkpIHtcbiAgICAgICAgICAvLyB2ZXJpZnkgY2VydGlmaWNhdGUgdGhyb3VnaCBhIHZhbGlkIGNlcnRpZmljYXRlIGNoYWluXG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2NhLnZlcmlmeShjZXJ0c1swXSlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZlcmlmeSBjZXJ0aWZpY2F0ZSB0aHJvdWdoIGhvc3QgY2VydGlmaWNhdGUgcGlubmluZ1xuICAgICAgICB2YXIgZnBQaW5uZWQgPSBwa2kuZ2V0UHVibGljS2V5RmluZ2VycHJpbnQodGhpcy5fY2EucHVibGljS2V5LCB7XG4gICAgICAgICAgZW5jb2Rpbmc6ICdoZXgnXG4gICAgICAgIH0pXG4gICAgICAgIHZhciBmcFJlbW90ZSA9IHBraS5nZXRQdWJsaWNLZXlGaW5nZXJwcmludChjZXJ0c1swXS5wdWJsaWNLZXksIHtcbiAgICAgICAgICBlbmNvZGluZzogJ2hleCdcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBjaGVjayBpZiBjZXJ0IGZpbmdlcnByaW50cyBtYXRjaFxuICAgICAgICBpZiAoZnBQaW5uZWQgPT09IGZwUmVtb3RlKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5vdGlmeSB0aGUgdXBwZXIgbGF5ZXIgb2YgdGhlIG5ldyBjZXJ0XG4gICAgICAgIHRoaXMudGxzY2VydChwa2kuY2VydGlmaWNhdGVUb1BlbShjZXJ0c1swXSkpXG4gICAgICAgIC8vIGZhaWwgd2hlbiBmaW5nZXJwcmludCBkb2VzIG5vdCBtYXRjaFxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH0sXG4gICAgICBjb25uZWN0ZWQ6IChjb25uZWN0aW9uKSA9PiB7XG4gICAgICAgIGlmICghY29ubmVjdGlvbikge1xuICAgICAgICAgIHRoaXMudGxzZXJyb3IoJ1VuYWJsZSB0byBjb25uZWN0JylcbiAgICAgICAgICB0aGlzLnRsc2Nsb3NlKClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRscyBjb25uZWN0aW9uIG9wZW5cbiAgICAgICAgdGhpcy5vcGVuID0gdHJ1ZVxuXG4gICAgICAgIHRoaXMudGxzb3BlbigpXG5cbiAgICAgICAgLy8gZW1wdHkgdGhlIGJ1ZmZlclxuICAgICAgICB3aGlsZSAodGhpcy5fb3V0Ym91bmRCdWZmZXIubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5wcmVwYXJlT3V0Ym91bmQodGhpcy5fb3V0Ym91bmRCdWZmZXIuc2hpZnQoKSlcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRsc0RhdGFSZWFkeTogKGNvbm5lY3Rpb24pID0+IHRoaXMudGxzb3V0Ym91bmQoczJhKGNvbm5lY3Rpb24udGxzRGF0YS5nZXRCeXRlcygpKSksXG4gICAgICBkYXRhUmVhZHk6IChjb25uZWN0aW9uKSA9PiB0aGlzLnRsc2luYm91bmQoczJhKGNvbm5lY3Rpb24uZGF0YS5nZXRCeXRlcygpKSksXG4gICAgICBjbG9zZWQ6ICgpID0+IHRoaXMudGxzY2xvc2UoKSxcbiAgICAgIGVycm9yOiAoY29ubmVjdGlvbiwgZXJyb3IpID0+IHtcbiAgICAgICAgdGhpcy50bHNlcnJvcihlcnJvci5tZXNzYWdlKVxuICAgICAgICB0aGlzLnRsc2Nsb3NlKClcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgY29uZmlndXJlIChvcHRpb25zKSB7XG4gICAgdGhpcy5faG9zdCA9IG9wdGlvbnMuaG9zdFxuICAgIGlmIChvcHRpb25zLmNhKSB7XG4gICAgICB0aGlzLl9jYSA9IHBraS5jZXJ0aWZpY2F0ZUZyb21QZW0ob3B0aW9ucy5jYSlcbiAgICB9XG4gIH1cblxuICBwcmVwYXJlT3V0Ym91bmQgKGJ1ZmZlcikge1xuICAgIGlmICghdGhpcy5vcGVuKSB7XG4gICAgICB0aGlzLl9vdXRib3VuZEJ1ZmZlci5wdXNoKGJ1ZmZlcilcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuX3Rscy5wcmVwYXJlKGEycyhidWZmZXIpKVxuICB9XG5cbiAgcHJvY2Vzc0luYm91bmQgKGJ1ZmZlcikge1xuICAgIHRoaXMuX3Rscy5wcm9jZXNzKGEycyhidWZmZXIpKVxuICB9XG5cbiAgaGFuZHNoYWtlICgpIHtcbiAgICB0aGlzLl90bHMuaGFuZHNoYWtlKClcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpZmllcyBhIGhvc3QgbmFtZSBieSB0aGUgQ29tbW9uIE5hbWUgb3IgU3ViamVjdCBBbHRlcm5hdGl2ZSBOYW1lc1xuICAgKiBFeHBvc2UgYXMgYSBtZXRob2Qgb2YgVGxzQ2xpZW50IGZvciB0ZXN0aW5nIHB1cnBvc2VzXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjZXJ0IEEgZm9yZ2UgY2VydGlmaWNhdGUgb2JqZWN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBob3N0IFRoZSBob3N0IG5hbWUsIGUuZy4gaW1hcC5nbWFpbC5jb21cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZSwgaWYgaG9zdCBuYW1lIG1hdGNoZXMgY2VydGlmaWNhdGUsIG90aGVyd2lzZSBmYWxzZVxuICAgKi9cbiAgdmVyaWZ5Q2VydGlmaWNhdGUgKGNlcnQsIGhvc3QpIHtcbiAgICBsZXQgZW50cmllc1xuXG4gICAgY29uc3Qgc3ViamVjdEFsdE5hbWUgPSBjZXJ0LmdldEV4dGVuc2lvbih7XG4gICAgICBuYW1lOiAnc3ViamVjdEFsdE5hbWUnXG4gICAgfSlcblxuICAgIGNvbnN0IGNuID0gY2VydC5zdWJqZWN0LmdldEZpZWxkKCdDTicpXG5cbiAgICAvLyBJZiBzdWJqZWN0QWx0TmFtZSBpcyBwcmVzZW50IHRoZW4gaXQgbXVzdCBiZSB1c2VkIGFuZCBDb21tb24gTmFtZSBtdXN0IGJlIGRpc2NhcmRlZFxuICAgIC8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzI4MTgjc2VjdGlvbi0zLjFcbiAgICAvLyBTbyB3ZSBjaGVjayBzdWJqZWN0QWx0TmFtZSBmaXJzdCBhbmQgaWYgaXQgZG9lcyBub3QgZXhpc3QgdGhlbiByZXZlcnQgYmFjayB0byBDb21tb24gTmFtZVxuICAgIGlmIChzdWJqZWN0QWx0TmFtZSAmJiBzdWJqZWN0QWx0TmFtZS5hbHROYW1lcyAmJiBzdWJqZWN0QWx0TmFtZS5hbHROYW1lcy5sZW5ndGgpIHtcbiAgICAgIGVudHJpZXMgPSBzdWJqZWN0QWx0TmFtZS5hbHROYW1lcy5tYXAoZnVuY3Rpb24gKGVudHJ5KSB7XG4gICAgICAgIHJldHVybiBlbnRyeS52YWx1ZVxuICAgICAgfSlcbiAgICB9IGVsc2UgaWYgKGNuICYmIGNuLnZhbHVlKSB7XG4gICAgICBlbnRyaWVzID0gW2NuLnZhbHVlXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICAvLyBmaW5kIG1hdGNoZXMgZm9yIGhvc3RuYW1lIGFuZCBpZiBhbnkgYXJlIGZvdW5kIHJldHVybiB0cnVlLCBvdGhlcndpc2UgcmV0dXJucyBmYWxzZVxuICAgIHJldHVybiAhIWVudHJpZXMuZmlsdGVyKHNhbkVudHJ5ID0+IHRoaXMuY29tcGFyZVNlcnZlcm5hbWUoaG9zdC50b0xvd2VyQ2FzZSgpLCBzYW5FbnRyeS50b0xvd2VyQ2FzZSgpKSkubGVuZ3RoXG4gIH1cblxuICAvKipcbiAgICogQ29tcGFyZXMgc2VydmVybmFtZSB3aXRoIGEgc3ViamVjdEFsdE5hbWUgZW50cnkuIFJldHVybnMgdHJ1ZSBpZiB0aGVzZSB2YWx1ZXMgbWF0Y2guXG4gICAqXG4gICAqIFdpbGRjYXJkIHVzYWdlIGluIGNlcnRpZmljYXRlIGhvc3RuYW1lcyBpcyB2ZXJ5IGxpbWl0ZWQsIHRoZSBvbmx5IHZhbGlkIHVzYWdlXG4gICAqIGZvcm0gaXMgXCIqLmRvbWFpblwiIGFuZCBub3QgXCIqc3ViLmRvbWFpblwiIG9yIFwic3ViLiouZG9tYWluXCIgc28gd2Ugb25seSBoYXZlIHRvIGNoZWNrXG4gICAqIGlmIHRoZSBlbnRyeSBzdGFydHMgd2l0aCBcIiouXCIgd2hlbiBjb21wYXJpbmcgYWdhaW5zdCBhIHdpbGRjYXJkIGhvc3RuYW1lLiBJZiBcIipcIiBpcyB1c2VkXG4gICAqIGluIGludmFsaWQgcGxhY2VzLCB0aGVuIHRyZWF0IGl0IGFzIGEgc3RyaW5nIGFuZCBub3QgYXMgYSB3aWxkY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlcnZlcm5hbWUgSG9zdG5hbWUgdG8gY2hlY2tcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNhbkVudHJ5IHN1YmplY3RBbHROYW1lIGVudHJ5IHRvIGNoZWNrIGFnYWluc3RcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiBob3N0bmFtZSBtYXRjaGVzIGVudHJ5IGZyb20gU0FOXG4gICAqL1xuICBjb21wYXJlU2VydmVybmFtZSAoc2VydmVybmFtZSA9ICcnLCBzYW5FbnRyeSA9ICcnKSB7XG4gICAgLy8gaWYgdGhlIGVudHJ5IG5hbWUgZG9lcyBub3QgaW5jbHVkZSBhIHdpbGRjYXJkLCB0aGVuIGV4cGVjdCBleGFjdCBtYXRjaFxuICAgIGlmIChzYW5FbnRyeS5zdWJzdHIoMCwgMikgIT09ICcqLicpIHtcbiAgICAgIHJldHVybiBzYW5FbnRyeSA9PT0gc2VydmVybmFtZVxuICAgIH1cblxuICAgIC8vIG90aGVyd2lzZSBpZ25vcmUgdGhlIGZpcnN0IHN1YmRvbWFpblxuICAgIHJldHVybiBzZXJ2ZXJuYW1lLnNwbGl0KCcuJykuc2xpY2UoMSkuam9pbignLicpID09PSBzYW5FbnRyeS5zdWJzdHIoMilcbiAgfVxufVxuXG5jb25zdCBhMnMgPSBhcnIgPT4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBuZXcgVWludDhBcnJheShhcnIpKVxuY29uc3QgczJhID0gc3RyID0+IG5ldyBVaW50OEFycmF5KHN0ci5zcGxpdCgnJykubWFwKGNoYXIgPT4gY2hhci5jaGFyQ29kZUF0KDApKSkuYnVmZmVyXG4iXX0=