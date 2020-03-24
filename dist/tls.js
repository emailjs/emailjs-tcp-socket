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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy90bHMuanMiXSwibmFtZXMiOlsiVGxzQ2xpZW50Iiwib3BlbiIsIl9vdXRib3VuZEJ1ZmZlciIsIl90bHMiLCJ0bHMiLCJjcmVhdGVDb25uZWN0aW9uIiwic2VydmVyIiwidmVyaWZ5IiwiY29ubmVjdGlvbiIsInZlcmlmaWVkIiwiZGVwdGgiLCJjZXJ0cyIsInZlcmlmeUNlcnRpZmljYXRlIiwiX2hvc3QiLCJfY2EiLCJ0bHNjZXJ0IiwicGtpIiwiY2VydGlmaWNhdGVUb1BlbSIsImZwUGlubmVkIiwiZ2V0UHVibGljS2V5RmluZ2VycHJpbnQiLCJwdWJsaWNLZXkiLCJlbmNvZGluZyIsImZwUmVtb3RlIiwiY29ubmVjdGVkIiwidGxzZXJyb3IiLCJ0bHNjbG9zZSIsInRsc29wZW4iLCJsZW5ndGgiLCJwcmVwYXJlT3V0Ym91bmQiLCJzaGlmdCIsInRsc0RhdGFSZWFkeSIsInRsc291dGJvdW5kIiwiczJhIiwidGxzRGF0YSIsImdldEJ5dGVzIiwiZGF0YVJlYWR5IiwidGxzaW5ib3VuZCIsImRhdGEiLCJjbG9zZWQiLCJlcnJvciIsIm1lc3NhZ2UiLCJvcHRpb25zIiwiaG9zdCIsImNhIiwiY2VydGlmaWNhdGVGcm9tUGVtIiwiYnVmZmVyIiwicHVzaCIsInByZXBhcmUiLCJhMnMiLCJwcm9jZXNzIiwiaGFuZHNoYWtlIiwiY2VydCIsImVudHJpZXMiLCJzdWJqZWN0QWx0TmFtZSIsImdldEV4dGVuc2lvbiIsIm5hbWUiLCJjbiIsInN1YmplY3QiLCJnZXRGaWVsZCIsImFsdE5hbWVzIiwibWFwIiwiZW50cnkiLCJ2YWx1ZSIsImZpbHRlciIsImNvbXBhcmVTZXJ2ZXJuYW1lIiwidG9Mb3dlckNhc2UiLCJzYW5FbnRyeSIsInNlcnZlcm5hbWUiLCJzdWJzdHIiLCJzcGxpdCIsInNsaWNlIiwiam9pbiIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsImFwcGx5IiwiVWludDhBcnJheSIsImFyciIsInN0ciIsImNoYXIiLCJjaGFyQ29kZUF0Il0s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O0FBQ0EsYUFBTyxDQUFDLENBQUNWLFFBQVFXLE1BQVIsQ0FBZTtBQUFBLGVBQVksT0FBS0MsaUJBQUwsQ0FBdUJ0QixLQUFLdUIsV0FBTCxFQUF2QixFQUEyQ0MsU0FBU0QsV0FBVCxFQUEzQyxDQUFaO0FBQUEsT0FBZixFQUErRnRDLE1BQXhHO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozt3Q0FZbUQ7QUFBQSxVQUFoQ3dDLFVBQWdDLHVFQUFuQixFQUFtQjtBQUFBLFVBQWZELFFBQWUsdUVBQUosRUFBSTs7QUFDakQ7QUFDQSxVQUFJQSxTQUFTRSxNQUFULENBQWdCLENBQWhCLEVBQW1CLENBQW5CLE1BQTBCLElBQTlCLEVBQW9DO0FBQ2xDLGVBQU9GLGFBQWFDLFVBQXBCO0FBQ0Q7O0FBRUQ7QUFDQSxhQUFPQSxXQUFXRSxLQUFYLENBQWlCLEdBQWpCLEVBQXNCQyxLQUF0QixDQUE0QixDQUE1QixFQUErQkMsSUFBL0IsQ0FBb0MsR0FBcEMsTUFBNkNMLFNBQVNFLE1BQVQsQ0FBZ0IsQ0FBaEIsQ0FBcEQ7QUFDRDs7Ozs7O2tCQWxLa0JwRSxTOzs7QUFxS3JCLElBQU1nRCxNQUFNLFNBQU5BLEdBQU07QUFBQSxTQUFPd0IsT0FBT0MsWUFBUCxDQUFvQkMsS0FBcEIsQ0FBMEIsSUFBMUIsRUFBZ0MsSUFBSUMsVUFBSixDQUFlQyxHQUFmLENBQWhDLENBQVA7QUFBQSxDQUFaO0FBQ0EsSUFBTTVDLE1BQU0sU0FBTkEsR0FBTTtBQUFBLFNBQU8sSUFBSTJDLFVBQUosQ0FBZUUsSUFBSVIsS0FBSixDQUFVLEVBQVYsRUFBY1QsR0FBZCxDQUFrQjtBQUFBLFdBQVFrQixLQUFLQyxVQUFMLENBQWdCLENBQWhCLENBQVI7QUFBQSxHQUFsQixDQUFmLEVBQThEbEMsTUFBckU7QUFBQSxDQUFaIiwiZmlsZSI6InRscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHRscywgcGtpIH0gZnJvbSAnbm9kZS1mb3JnZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGxzQ2xpZW50IHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHRoaXMub3BlbiA9IGZhbHNlXG4gICAgdGhpcy5fb3V0Ym91bmRCdWZmZXIgPSBbXVxuXG4gICAgdGhpcy5fdGxzID0gdGxzLmNyZWF0ZUNvbm5lY3Rpb24oe1xuICAgICAgc2VydmVyOiBmYWxzZSxcbiAgICAgIHZlcmlmeTogKGNvbm5lY3Rpb24sIHZlcmlmaWVkLCBkZXB0aCwgY2VydHMpID0+IHtcbiAgICAgICAgaWYgKCEoY2VydHMgJiYgY2VydHNbMF0pKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMudmVyaWZ5Q2VydGlmaWNhdGUoY2VydHNbMF0sIHRoaXMuX2hvc3QpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cblxuICAgICAgICAvKlxuICAgICAgICAgKiBQbGVhc2Ugc2VlIHRoZSByZWFkbWUgZm9yIGFuIGV4cGxhbmF0aW9uIG9mIHRoZSBiZWhhdmlvciB3aXRob3V0IGEgbmF0aXZlIFRMUyBzdGFjayFcbiAgICAgICAgICovXG5cbiAgICAgICAgLy8gd2l0aG91dCBhIHBpbm5lZCBjZXJ0aWZpY2F0ZSwgd2UnbGwganVzdCBhY2NlcHQgdGhlIGNvbm5lY3Rpb24gYW5kIG5vdGlmeSB0aGUgdXBwZXIgbGF5ZXJcbiAgICAgICAgaWYgKCF0aGlzLl9jYSkge1xuICAgICAgICAgIC8vIG5vdGlmeSB0aGUgdXBwZXIgbGF5ZXIgb2YgdGhlIG5ldyBjZXJ0XG4gICAgICAgICAgdGhpcy50bHNjZXJ0KHBraS5jZXJ0aWZpY2F0ZVRvUGVtKGNlcnRzWzBdKSlcbiAgICAgICAgICAvLyBzdWNjZWVkIG9ubHkgaWYgdGhpcy50bHNjZXJ0IGlzIGltcGxlbWVudGVkIChvdGhlcndpc2UgZm9yZ2UgY2F0Y2hlcyB0aGUgZXJyb3IpXG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBwaW5uZWQgY2VydGlmaWNhdGUsIHRoaW5ncyBnZXQgYSBsaXR0bGUgbW9yZSBjb21wbGljYXRlZDpcbiAgICAgICAgLy8gLSBsZWFmIGNlcnRpZmljYXRlcyBwaW4gdGhlIGhvc3QgZGlyZWN0bHksIGUuZy4gZm9yIHNlbGYtc2lnbmVkIGNlcnRpZmljYXRlc1xuICAgICAgICAvLyAtIHdlIGFsc28gYWxsb3cgaW50ZXJtZWRpYXRlIGNlcnRpZmljYXRlcywgZm9yIHByb3ZpZGVycyB0aGF0IGFyZSBhYmxlIHRvIHNpZ24gdGhlaXIgb3duIGNlcnRzLlxuXG4gICAgICAgIC8vIGRldGVjdCBpZiB0aGlzIGlzIGEgY2VydGlmaWNhdGUgdXNlZCBmb3Igc2lnbmluZyBieSB0ZXN0aW5nIGlmIHRoZSBjb21tb24gbmFtZSBkaWZmZXJlbnQgZnJvbSB0aGUgaG9zdG5hbWUuXG4gICAgICAgIC8vIGFsc28sIGFuIGludGVybWVkaWF0ZSBjZXJ0IGhhcyBubyBTQU5zLCBhdCBsZWFzdCBub25lIHRoYXQgbWF0Y2ggdGhlIGhvc3RuYW1lLlxuICAgICAgICBpZiAoIXRoaXMudmVyaWZ5Q2VydGlmaWNhdGUodGhpcy5fY2EsIHRoaXMuX2hvc3QpKSB7XG4gICAgICAgICAgLy8gdmVyaWZ5IGNlcnRpZmljYXRlIHRocm91Z2ggYSB2YWxpZCBjZXJ0aWZpY2F0ZSBjaGFpblxuICAgICAgICAgIHJldHVybiB0aGlzLl9jYS52ZXJpZnkoY2VydHNbMF0pXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2ZXJpZnkgY2VydGlmaWNhdGUgdGhyb3VnaCBob3N0IGNlcnRpZmljYXRlIHBpbm5pbmdcbiAgICAgICAgdmFyIGZwUGlubmVkID0gcGtpLmdldFB1YmxpY0tleUZpbmdlcnByaW50KHRoaXMuX2NhLnB1YmxpY0tleSwge1xuICAgICAgICAgIGVuY29kaW5nOiAnaGV4J1xuICAgICAgICB9KVxuICAgICAgICB2YXIgZnBSZW1vdGUgPSBwa2kuZ2V0UHVibGljS2V5RmluZ2VycHJpbnQoY2VydHNbMF0ucHVibGljS2V5LCB7XG4gICAgICAgICAgZW5jb2Rpbmc6ICdoZXgnXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gY2hlY2sgaWYgY2VydCBmaW5nZXJwcmludHMgbWF0Y2hcbiAgICAgICAgaWYgKGZwUGlubmVkID09PSBmcFJlbW90ZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyBub3RpZnkgdGhlIHVwcGVyIGxheWVyIG9mIHRoZSBuZXcgY2VydFxuICAgICAgICB0aGlzLnRsc2NlcnQocGtpLmNlcnRpZmljYXRlVG9QZW0oY2VydHNbMF0pKVxuICAgICAgICAvLyBmYWlsIHdoZW4gZmluZ2VycHJpbnQgZG9lcyBub3QgbWF0Y2hcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9LFxuICAgICAgY29ubmVjdGVkOiAoY29ubmVjdGlvbikgPT4ge1xuICAgICAgICBpZiAoIWNvbm5lY3Rpb24pIHtcbiAgICAgICAgICB0aGlzLnRsc2Vycm9yKCdVbmFibGUgdG8gY29ubmVjdCcpXG4gICAgICAgICAgdGhpcy50bHNjbG9zZSgpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICAvLyB0bHMgY29ubmVjdGlvbiBvcGVuXG4gICAgICAgIHRoaXMub3BlbiA9IHRydWVcblxuICAgICAgICB0aGlzLnRsc29wZW4oKVxuXG4gICAgICAgIC8vIGVtcHR5IHRoZSBidWZmZXJcbiAgICAgICAgd2hpbGUgKHRoaXMuX291dGJvdW5kQnVmZmVyLmxlbmd0aCkge1xuICAgICAgICAgIHRoaXMucHJlcGFyZU91dGJvdW5kKHRoaXMuX291dGJvdW5kQnVmZmVyLnNoaWZ0KCkpXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB0bHNEYXRhUmVhZHk6IChjb25uZWN0aW9uKSA9PiB0aGlzLnRsc291dGJvdW5kKHMyYShjb25uZWN0aW9uLnRsc0RhdGEuZ2V0Qnl0ZXMoKSkpLFxuICAgICAgZGF0YVJlYWR5OiAoY29ubmVjdGlvbikgPT4gdGhpcy50bHNpbmJvdW5kKHMyYShjb25uZWN0aW9uLmRhdGEuZ2V0Qnl0ZXMoKSkpLFxuICAgICAgY2xvc2VkOiAoKSA9PiB0aGlzLnRsc2Nsb3NlKCksXG4gICAgICBlcnJvcjogKGNvbm5lY3Rpb24sIGVycm9yKSA9PiB7XG4gICAgICAgIHRoaXMudGxzZXJyb3IoZXJyb3IubWVzc2FnZSlcbiAgICAgICAgdGhpcy50bHNjbG9zZSgpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGNvbmZpZ3VyZSAob3B0aW9ucykge1xuICAgIHRoaXMuX2hvc3QgPSBvcHRpb25zLmhvc3RcbiAgICBpZiAob3B0aW9ucy5jYSkge1xuICAgICAgdGhpcy5fY2EgPSBwa2kuY2VydGlmaWNhdGVGcm9tUGVtKG9wdGlvbnMuY2EpXG4gICAgfVxuICB9XG5cbiAgcHJlcGFyZU91dGJvdW5kIChidWZmZXIpIHtcbiAgICBpZiAoIXRoaXMub3Blbikge1xuICAgICAgdGhpcy5fb3V0Ym91bmRCdWZmZXIucHVzaChidWZmZXIpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLl90bHMucHJlcGFyZShhMnMoYnVmZmVyKSlcbiAgfVxuXG4gIHByb2Nlc3NJbmJvdW5kIChidWZmZXIpIHtcbiAgICB0aGlzLl90bHMucHJvY2VzcyhhMnMoYnVmZmVyKSlcbiAgfVxuXG4gIGhhbmRzaGFrZSAoKSB7XG4gICAgdGhpcy5fdGxzLmhhbmRzaGFrZSgpXG4gIH1cblxuICAvKipcbiAgICogVmVyaWZpZXMgYSBob3N0IG5hbWUgYnkgdGhlIENvbW1vbiBOYW1lIG9yIFN1YmplY3QgQWx0ZXJuYXRpdmUgTmFtZXNcbiAgICogRXhwb3NlIGFzIGEgbWV0aG9kIG9mIFRsc0NsaWVudCBmb3IgdGVzdGluZyBwdXJwb3Nlc1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gY2VydCBBIGZvcmdlIGNlcnRpZmljYXRlIG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gaG9zdCBUaGUgaG9zdCBuYW1lLCBlLmcuIGltYXAuZ21haWwuY29tXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWUsIGlmIGhvc3QgbmFtZSBtYXRjaGVzIGNlcnRpZmljYXRlLCBvdGhlcndpc2UgZmFsc2VcbiAgICovXG4gIHZlcmlmeUNlcnRpZmljYXRlIChjZXJ0LCBob3N0KSB7XG4gICAgbGV0IGVudHJpZXNcblxuICAgIGNvbnN0IHN1YmplY3RBbHROYW1lID0gY2VydC5nZXRFeHRlbnNpb24oe1xuICAgICAgbmFtZTogJ3N1YmplY3RBbHROYW1lJ1xuICAgIH0pXG5cbiAgICBjb25zdCBjbiA9IGNlcnQuc3ViamVjdC5nZXRGaWVsZCgnQ04nKVxuXG4gICAgLy8gSWYgc3ViamVjdEFsdE5hbWUgaXMgcHJlc2VudCB0aGVuIGl0IG11c3QgYmUgdXNlZCBhbmQgQ29tbW9uIE5hbWUgbXVzdCBiZSBkaXNjYXJkZWRcbiAgICAvLyBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMyODE4I3NlY3Rpb24tMy4xXG4gICAgLy8gU28gd2UgY2hlY2sgc3ViamVjdEFsdE5hbWUgZmlyc3QgYW5kIGlmIGl0IGRvZXMgbm90IGV4aXN0IHRoZW4gcmV2ZXJ0IGJhY2sgdG8gQ29tbW9uIE5hbWVcbiAgICBpZiAoc3ViamVjdEFsdE5hbWUgJiYgc3ViamVjdEFsdE5hbWUuYWx0TmFtZXMgJiYgc3ViamVjdEFsdE5hbWUuYWx0TmFtZXMubGVuZ3RoKSB7XG4gICAgICBlbnRyaWVzID0gc3ViamVjdEFsdE5hbWUuYWx0TmFtZXMubWFwKGZ1bmN0aW9uIChlbnRyeSkge1xuICAgICAgICByZXR1cm4gZW50cnkudmFsdWVcbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmIChjbiAmJiBjbi52YWx1ZSkge1xuICAgICAgZW50cmllcyA9IFtjbi52YWx1ZV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgLy8gZmluZCBtYXRjaGVzIGZvciBob3N0bmFtZSBhbmQgaWYgYW55IGFyZSBmb3VuZCByZXR1cm4gdHJ1ZSwgb3RoZXJ3aXNlIHJldHVybnMgZmFsc2VcbiAgICByZXR1cm4gISFlbnRyaWVzLmZpbHRlcihzYW5FbnRyeSA9PiB0aGlzLmNvbXBhcmVTZXJ2ZXJuYW1lKGhvc3QudG9Mb3dlckNhc2UoKSwgc2FuRW50cnkudG9Mb3dlckNhc2UoKSkpLmxlbmd0aFxuICB9XG5cbiAgLyoqXG4gICAqIENvbXBhcmVzIHNlcnZlcm5hbWUgd2l0aCBhIHN1YmplY3RBbHROYW1lIGVudHJ5LiBSZXR1cm5zIHRydWUgaWYgdGhlc2UgdmFsdWVzIG1hdGNoLlxuICAgKlxuICAgKiBXaWxkY2FyZCB1c2FnZSBpbiBjZXJ0aWZpY2F0ZSBob3N0bmFtZXMgaXMgdmVyeSBsaW1pdGVkLCB0aGUgb25seSB2YWxpZCB1c2FnZVxuICAgKiBmb3JtIGlzIFwiKi5kb21haW5cIiBhbmQgbm90IFwiKnN1Yi5kb21haW5cIiBvciBcInN1Yi4qLmRvbWFpblwiIHNvIHdlIG9ubHkgaGF2ZSB0byBjaGVja1xuICAgKiBpZiB0aGUgZW50cnkgc3RhcnRzIHdpdGggXCIqLlwiIHdoZW4gY29tcGFyaW5nIGFnYWluc3QgYSB3aWxkY2FyZCBob3N0bmFtZS4gSWYgXCIqXCIgaXMgdXNlZFxuICAgKiBpbiBpbnZhbGlkIHBsYWNlcywgdGhlbiB0cmVhdCBpdCBhcyBhIHN0cmluZyBhbmQgbm90IGFzIGEgd2lsZGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZXJ2ZXJuYW1lIEhvc3RuYW1lIHRvIGNoZWNrXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzYW5FbnRyeSBzdWJqZWN0QWx0TmFtZSBlbnRyeSB0byBjaGVjayBhZ2FpbnN0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBSZXR1cm5zIHRydWUgaWYgaG9zdG5hbWUgbWF0Y2hlcyBlbnRyeSBmcm9tIFNBTlxuICAgKi9cbiAgY29tcGFyZVNlcnZlcm5hbWUgKHNlcnZlcm5hbWUgPSAnJywgc2FuRW50cnkgPSAnJykge1xuICAgIC8vIGlmIHRoZSBlbnRyeSBuYW1lIGRvZXMgbm90IGluY2x1ZGUgYSB3aWxkY2FyZCwgdGhlbiBleHBlY3QgZXhhY3QgbWF0Y2hcbiAgICBpZiAoc2FuRW50cnkuc3Vic3RyKDAsIDIpICE9PSAnKi4nKSB7XG4gICAgICByZXR1cm4gc2FuRW50cnkgPT09IHNlcnZlcm5hbWVcbiAgICB9XG5cbiAgICAvLyBvdGhlcndpc2UgaWdub3JlIHRoZSBmaXJzdCBzdWJkb21haW5cbiAgICByZXR1cm4gc2VydmVybmFtZS5zcGxpdCgnLicpLnNsaWNlKDEpLmpvaW4oJy4nKSA9PT0gc2FuRW50cnkuc3Vic3RyKDIpXG4gIH1cbn1cblxuY29uc3QgYTJzID0gYXJyID0+IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgbmV3IFVpbnQ4QXJyYXkoYXJyKSlcbmNvbnN0IHMyYSA9IHN0ciA9PiBuZXcgVWludDhBcnJheShzdHIuc3BsaXQoJycpLm1hcChjaGFyID0+IGNoYXIuY2hhckNvZGVBdCgwKSkpLmJ1ZmZlclxuIl19