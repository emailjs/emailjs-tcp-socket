'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ramda = require('ramda');

var _timeout = require('./timeout');

var _timeout2 = _interopRequireDefault(_timeout);

var _tlsUtils = require('./tls-utils');

var _tlsUtils2 = _interopRequireDefault(_tlsUtils);

var _workerUtils = require('./worker-utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TCPSocket = function () {
  _createClass(TCPSocket, null, [{
    key: 'open',
    value: function open(host, port) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return new TCPSocket({ host: host, port: port, options: options });
    }
  }]);

  function TCPSocket(_ref) {
    var _this = this;

    var host = _ref.host,
        port = _ref.port,
        options = _ref.options;

    _classCallCheck(this, TCPSocket);

    this.host = host;
    this.port = port;
    this.ssl = false;
    this.bufferedAmount = 0;
    this.readyState = 'connecting';
    this.binaryType = (0, _ramda.propOr)('arraybuffer', 'binaryType')(options);

    if (this.binaryType !== 'arraybuffer') {
      throw new Error('Only arraybuffers are supported!');
    }

    this._ca = options.ca;
    this._useTLS = (0, _ramda.propOr)(false, 'useSecureTransport')(options);
    this._useSTARTTLS = false;
    this._socketId = 0;
    this._useLegacySocket = false;
    this._useForgeTls = false;

    // handles writes during starttls handshake, chrome socket only
    this._startTlsBuffer = [];
    this._startTlsHandshakeInProgress = false;

    chrome.runtime.getPlatformInfo(function (platformInfo) {
      if (platformInfo.os.indexOf('cordova') !== -1) {
        // chrome.sockets.tcp.secure is not functional on cordova
        // https://github.com/MobileChromeApps/mobile-chrome-apps/issues/269
        _this._useLegacySocket = false;
        _this._useForgeTls = true;
      } else {
        _this._useLegacySocket = true;
        _this._useForgeTls = false;
      }

      if (_this._useLegacySocket) {
        _this._createLegacySocket();
      } else {
        _this._createSocket();
      }
    });
  }

  /**
   * Creates a socket using the deprecated chrome.socket API
   */


  _createClass(TCPSocket, [{
    key: '_createLegacySocket',
    value: function _createLegacySocket() {
      var _this2 = this;

      chrome.socket.create('tcp', {}, function (createInfo) {
        _this2._socketId = createInfo.socketId;

        chrome.socket.connect(_this2._socketId, _this2.host, _this2.port, function (result) {
          if (result !== 0) {
            _this2.readyState = 'closed';
            _this2._emit('error', chrome.runtime.lastError);
            return;
          }

          _this2._onSocketConnected();
        });
      });
    }

    /**
     * Creates a socket using chrome.sockets.tcp
     */

  }, {
    key: '_createSocket',
    value: function _createSocket() {
      var _this3 = this;

      chrome.sockets.tcp.create({}, function (createInfo) {
        _this3._socketId = createInfo.socketId;

        // register for data events on the socket before connecting
        chrome.sockets.tcp.onReceive.addListener(function (readInfo) {
          if (readInfo.socketId === _this3._socketId) {
            // process the data available on the socket
            _this3._onData(readInfo.data);
          }
        });

        // register for data error on the socket before connecting
        chrome.sockets.tcp.onReceiveError.addListener(function (readInfo) {
          if (readInfo.socketId === _this3._socketId) {
            // socket closed remotely or broken
            _this3.close();
          }
        });

        chrome.sockets.tcp.setPaused(_this3._socketId, true, function () {
          chrome.sockets.tcp.connect(_this3._socketId, _this3.host, _this3.port, function (result) {
            if (result < 0) {
              _this3.readyState = 'closed';
              _this3._emit('error', chrome.runtime.lastError);
              return;
            }

            _this3._onSocketConnected();
          });
        });
      });
    }

    /**
     * Invoked once a socket has been connected:
     * - Kicks off TLS handshake, if necessary
     * - Starts reading from legacy socket, if necessary
     */

  }, {
    key: '_onSocketConnected',
    value: function _onSocketConnected() {
      var _this4 = this;

      var read = function read() {
        if (_this4._useLegacySocket) {
          // the tls handshake is done let's start reading from the legacy socket
          _this4._readLegacySocket();
          _this4._emit('open');
        } else {
          chrome.sockets.tcp.setPaused(_this4._socketId, false, function () {
            _this4._emit('open');
          });
        }
      };

      if (!this._useTLS) {
        return read();
      }

      // do an immediate TLS handshake if this._useTLS === true
      this._upgradeToSecure(function () {
        read();
      });
    }

    /**
     * Handles the rough edges for differences between chrome.socket and chrome.sockets.tcp
     * for upgrading to a TLS connection with or without forge
     */

  }, {
    key: '_upgradeToSecure',
    value: function _upgradeToSecure() {
      var _this5 = this;

      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

      // invoked after chrome.socket.secure or chrome.sockets.tcp.secure have been upgraded
      var onUpgraded = function onUpgraded(tlsResult) {
        if (tlsResult !== 0) {
          _this5._emit('error', new Error('TLS handshake failed. Reason: ' + chrome.runtime.lastError.message));
          _this5.close();
          return;
        }

        _this5.ssl = true;

        // empty the buffer
        while (_this5._startTlsBuffer.length) {
          _this5.send(_this5._startTlsBuffer.shift());
        }

        callback();
      };

      if (!this._useLegacySocket && this.readyState !== 'open') {
        // use chrome.sockets.tcp.secure for TLS, not for STARTTLS!
        // use forge only for STARTTLS
        this._useForgeTls = false;
        chrome.sockets.tcp.secure(this._socketId, onUpgraded);
      } else if (this._useLegacySocket) {
        chrome.socket.secure(this._socketId, onUpgraded);
      } else if (this._useForgeTls) {
        // setup the forge tls client or webworker as tls fallback
        (0, _tlsUtils2.default)(this);
        callback();
      }
    }
  }, {
    key: 'upgradeToSecure',
    value: function upgradeToSecure() {
      var _this6 = this;

      if (this.ssl || this._useSTARTTLS) {
        return;
      }

      this._useSTARTTLS = true;
      this._upgradeToSecure(function () {
        if (_this6._useLegacySocket) {
          _this6._readLegacySocket(); // tls handshake is done, restart reading
        }
      });
    }

    /**
     * Reads from a legacy chrome.socket.
     */

  }, {
    key: '_readLegacySocket',
    value: function _readLegacySocket() {
      var _this7 = this;

      if (this._socketId === 0) {
        // the socket is closed. omit read and stop further reads
        return;
      }

      // don't read from chrome.socket if we have chrome.socket.secure a handshake in progress!
      if ((this._useSTARTTLS || this._useTLS) && !this.ssl) {
        return;
      }

      chrome.socket.read(this._socketId, function (readInfo) {
        // socket closed remotely or broken
        if (readInfo.resultCode <= 0) {
          _this7._socketId = 0;
          _this7.close();
          return;
        }

        // process the data available on the socket
        _this7._onData(readInfo.data);

        // Queue the next read.
        // If a STARTTLS handshake might be upcoming, postpone this onto
        // the task queue so the IMAP client has a chance to call upgradeToSecure;
        // without this, we might eat the beginning of the handshake.
        // If we are already secure, just call it (for performance).
        if (_this7.ssl) {
          _this7._readLegacySocket();
        } else {
          (0, _timeout2.default)(function () {
            return _this7._readLegacySocket();
          });
        }
      });
    }

    /**
     * Invoked when data has been read from the socket. Handles cases when to feed
     * the data available on the socket to forge.
     *
     * @param {ArrayBuffer} buffer The binary data read from the socket
     */

  }, {
    key: '_onData',
    value: function _onData(buffer) {
      if ((this._useTLS || this._useSTARTTLS) && this._useForgeTls) {
        // feed the data to the tls client
        if (this._tlsWorker) {
          this._tlsWorker.postMessage((0, _workerUtils.createMessage)(_workerUtils.EVENT_INBOUND, buffer), [buffer]);
        } else {
          this._tls.processInbound(buffer);
        }
      } else {
        // emit data event
        this._emit('data', buffer);
      }
    }

    /**
     * Closes the socket
     * @return {[type]} [description]
     */

  }, {
    key: 'close',
    value: function close() {
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
    }
  }, {
    key: 'send',
    value: function send(buffer) {
      if (!this._useForgeTls && this._useSTARTTLS && !this.ssl) {
        // buffer the unprepared data until chrome.socket(s.tcp) handshake is done
        this._startTlsBuffer.push(buffer);
      } else if (this._useForgeTls && (this._useTLS || this._useSTARTTLS)) {
        // give buffer to forge to be prepared for tls
        if (this._tlsWorker) {
          this._tlsWorker.postMessage((0, _workerUtils.createMessage)(_workerUtils.EVENT_OUTBOUND, buffer), [buffer]);
        } else {
          this._tls.prepareOutbound(buffer);
        }
      } else {
        // send the arraybuffer
        this._send(buffer);
      }
    }
  }, {
    key: '_send',
    value: function _send(data) {
      var _this8 = this;

      if (this._socketId === 0) {
        // the socket is closed.
        return;
      }

      if (this._useLegacySocket) {
        chrome.socket.write(this._socketId, data, function (writeInfo) {
          if (writeInfo.bytesWritten < 0 && _this8._socketId !== 0) {
            // if the socket is already 0, it has already been closed. no need to alert then...
            _this8._emit('error', new Error('Could not write ' + data.byteLength + ' bytes to socket ' + _this8._socketId + '. Chrome error code: ' + writeInfo.bytesWritten));
            _this8._socketId = 0;
            _this8.close();

            return;
          }

          _this8._emit('drain');
        });
      } else {
        chrome.sockets.tcp.send(this._socketId, data, function (sendInfo) {
          if (sendInfo.bytesSent < 0 && _this8._socketId !== 0) {
            // if the socket is already 0, it has already been closed. no need to alert then...
            _this8._emit('error', new Error('Could not write ' + data.byteLength + ' bytes to socket ' + _this8._socketId + '. Chrome error code: ' + sendInfo.bytesSent));
            _this8.close();

            return;
          }

          _this8._emit('drain');
        });
      }
    }
  }, {
    key: '_emit',
    value: function _emit(type, data) {
      var target = this;
      switch (type) {
        case 'open':
          this.readyState = 'open';
          this.onopen && this.onopen({ target: target, type: type, data: data });
          break;
        case 'error':
          this.onerror && this.onerror({ target: target, type: type, data: data });
          break;
        case 'data':
          this.ondata && this.ondata({ target: target, type: type, data: data });
          break;
        case 'drain':
          this.ondrain && this.ondrain({ target: target, type: type, data: data });
          break;
        case 'close':
          this.readyState = 'closed';
          this.onclose && this.onclose({ target: target, type: type, data: data });
          break;
      }
    }
  }]);

  return TCPSocket;
}();

exports.default = TCPSocket;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jaHJvbWUtc29ja2V0LmpzIl0sIm5hbWVzIjpbIlRDUFNvY2tldCIsImhvc3QiLCJwb3J0Iiwib3B0aW9ucyIsInNzbCIsImJ1ZmZlcmVkQW1vdW50IiwicmVhZHlTdGF0ZSIsImJpbmFyeVR5cGUiLCJFcnJvciIsIl9jYSIsImNhIiwiX3VzZVRMUyIsIl91c2VTVEFSVFRMUyIsIl9zb2NrZXRJZCIsIl91c2VMZWdhY3lTb2NrZXQiLCJfdXNlRm9yZ2VUbHMiLCJfc3RhcnRUbHNCdWZmZXIiLCJfc3RhcnRUbHNIYW5kc2hha2VJblByb2dyZXNzIiwiY2hyb21lIiwicnVudGltZSIsImdldFBsYXRmb3JtSW5mbyIsInBsYXRmb3JtSW5mbyIsIm9zIiwiaW5kZXhPZiIsIl9jcmVhdGVMZWdhY3lTb2NrZXQiLCJfY3JlYXRlU29ja2V0Iiwic29ja2V0IiwiY3JlYXRlIiwiY3JlYXRlSW5mbyIsInNvY2tldElkIiwiY29ubmVjdCIsInJlc3VsdCIsIl9lbWl0IiwibGFzdEVycm9yIiwiX29uU29ja2V0Q29ubmVjdGVkIiwic29ja2V0cyIsInRjcCIsIm9uUmVjZWl2ZSIsImFkZExpc3RlbmVyIiwicmVhZEluZm8iLCJfb25EYXRhIiwiZGF0YSIsIm9uUmVjZWl2ZUVycm9yIiwiY2xvc2UiLCJzZXRQYXVzZWQiLCJyZWFkIiwiX3JlYWRMZWdhY3lTb2NrZXQiLCJfdXBncmFkZVRvU2VjdXJlIiwiY2FsbGJhY2siLCJvblVwZ3JhZGVkIiwidGxzUmVzdWx0IiwibWVzc2FnZSIsImxlbmd0aCIsInNlbmQiLCJzaGlmdCIsInNlY3VyZSIsInJlc3VsdENvZGUiLCJidWZmZXIiLCJfdGxzV29ya2VyIiwicG9zdE1lc3NhZ2UiLCJFVkVOVF9JTkJPVU5EIiwiX3RscyIsInByb2Nlc3NJbmJvdW5kIiwiZGlzY29ubmVjdCIsImRlc3Ryb3kiLCJ0ZXJtaW5hdGUiLCJ1bmRlZmluZWQiLCJwdXNoIiwiRVZFTlRfT1VUQk9VTkQiLCJwcmVwYXJlT3V0Ym91bmQiLCJfc2VuZCIsIndyaXRlIiwid3JpdGVJbmZvIiwiYnl0ZXNXcml0dGVuIiwiYnl0ZUxlbmd0aCIsInNlbmRJbmZvIiwiYnl0ZXNTZW50IiwidHlwZSIsInRhcmdldCIsIm9ub3BlbiIsIm9uZXJyb3IiLCJvbmRhdGEiLCJvbmRyYWluIiwib25jbG9zZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztJQUtxQkEsUzs7O3lCQUNOQyxJLEVBQU1DLEksRUFBb0I7QUFBQSxVQUFkQyxPQUFjLHVFQUFKLEVBQUk7O0FBQ3JDLGFBQU8sSUFBSUgsU0FBSixDQUFjLEVBQUVDLFVBQUYsRUFBUUMsVUFBUixFQUFjQyxnQkFBZCxFQUFkLENBQVA7QUFDRDs7O0FBRUQsMkJBQXNDO0FBQUE7O0FBQUEsUUFBdkJGLElBQXVCLFFBQXZCQSxJQUF1QjtBQUFBLFFBQWpCQyxJQUFpQixRQUFqQkEsSUFBaUI7QUFBQSxRQUFYQyxPQUFXLFFBQVhBLE9BQVc7O0FBQUE7O0FBQ3BDLFNBQUtGLElBQUwsR0FBWUEsSUFBWjtBQUNBLFNBQUtDLElBQUwsR0FBWUEsSUFBWjtBQUNBLFNBQUtFLEdBQUwsR0FBVyxLQUFYO0FBQ0EsU0FBS0MsY0FBTCxHQUFzQixDQUF0QjtBQUNBLFNBQUtDLFVBQUwsR0FBa0IsWUFBbEI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLG1CQUFPLGFBQVAsRUFBc0IsWUFBdEIsRUFBb0NKLE9BQXBDLENBQWxCOztBQUVBLFFBQUksS0FBS0ksVUFBTCxLQUFvQixhQUF4QixFQUF1QztBQUNyQyxZQUFNLElBQUlDLEtBQUosQ0FBVSxrQ0FBVixDQUFOO0FBQ0Q7O0FBRUQsU0FBS0MsR0FBTCxHQUFXTixRQUFRTyxFQUFuQjtBQUNBLFNBQUtDLE9BQUwsR0FBZSxtQkFBTyxLQUFQLEVBQWMsb0JBQWQsRUFBb0NSLE9BQXBDLENBQWY7QUFDQSxTQUFLUyxZQUFMLEdBQW9CLEtBQXBCO0FBQ0EsU0FBS0MsU0FBTCxHQUFpQixDQUFqQjtBQUNBLFNBQUtDLGdC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QUFVRCxVQUFWLEVBQWdCcEMsVUFBaEIsRUFBYixDQUFoQjtBQUNBO0FBQ0YsYUFBSyxPQUFMO0FBQ0UsZUFBS25DLFVBQUwsR0FBa0IsUUFBbEI7QUFDQSxlQUFLNkUsT0FBTCxJQUFnQixLQUFLQSxPQUFMLENBQWEsRUFBRUwsY0FBRixFQUFVRCxVQUFWLEVBQWdCcEMsVUFBaEIsRUFBYixDQUFoQjtBQUNBO0FBakJKO0FBbUJEOzs7Ozs7a0JBbFZrQnpDLFMiLCJmaWxlIjoiY2hyb21lLXNvY2tldC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHByb3BPciB9IGZyb20gJ3JhbWRhJ1xuaW1wb3J0IHNjaGVkdWxlSW5OZXh0RXZlbnRMb29wIGZyb20gJy4vdGltZW91dCdcbmltcG9ydCBjcmVhdGVUbHMgZnJvbSAnLi90bHMtdXRpbHMnXG5pbXBvcnQge1xuICBFVkVOVF9JTkJPVU5ELCBFVkVOVF9PVVRCT1VORCxcbiAgY3JlYXRlTWVzc2FnZVxufSBmcm9tICcuL3dvcmtlci11dGlscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVENQU29ja2V0IHtcbiAgc3RhdGljIG9wZW4gKGhvc3QsIHBvcnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiBuZXcgVENQU29ja2V0KHsgaG9zdCwgcG9ydCwgb3B0aW9ucyB9KVxuICB9XG5cbiAgY29uc3RydWN0b3IgKHsgaG9zdCwgcG9ydCwgb3B0aW9ucyB9KSB7XG4gICAgdGhpcy5ob3N0ID0gaG9zdFxuICAgIHRoaXMucG9ydCA9IHBvcnRcbiAgICB0aGlzLnNzbCA9IGZhbHNlXG4gICAgdGhpcy5idWZmZXJlZEFtb3VudCA9IDBcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY29ubmVjdGluZydcbiAgICB0aGlzLmJpbmFyeVR5cGUgPSBwcm9wT3IoJ2FycmF5YnVmZmVyJywgJ2JpbmFyeVR5cGUnKShvcHRpb25zKVxuXG4gICAgaWYgKHRoaXMuYmluYXJ5VHlwZSAhPT0gJ2FycmF5YnVmZmVyJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IGFycmF5YnVmZmVycyBhcmUgc3VwcG9ydGVkIScpXG4gICAgfVxuXG4gICAgdGhpcy5fY2EgPSBvcHRpb25zLmNhXG4gICAgdGhpcy5fdXNlVExTID0gcHJvcE9yKGZhbHNlLCAndXNlU2VjdXJlVHJhbnNwb3J0Jykob3B0aW9ucylcbiAgICB0aGlzLl91c2VTVEFSVFRMUyA9IGZhbHNlXG4gICAgdGhpcy5fc29ja2V0SWQgPSAwXG4gICAgdGhpcy5fdXNlTGVnYWN5U29ja2V0ID0gZmFsc2VcbiAgICB0aGlzLl91c2VGb3JnZVRscyA9IGZhbHNlXG5cbiAgICAvLyBoYW5kbGVzIHdyaXRlcyBkdXJpbmcgc3RhcnR0bHMgaGFuZHNoYWtlLCBjaHJvbWUgc29ja2V0IG9ubHlcbiAgICB0aGlzLl9zdGFydFRsc0J1ZmZlciA9IFtdXG4gICAgdGhpcy5fc3RhcnRUbHNIYW5kc2hha2VJblByb2dyZXNzID0gZmFsc2VcblxuICAgIGNocm9tZS5ydW50aW1lLmdldFBsYXRmb3JtSW5mbyhwbGF0Zm9ybUluZm8gPT4ge1xuICAgICAgaWYgKHBsYXRmb3JtSW5mby5vcy5pbmRleE9mKCdjb3Jkb3ZhJykgIT09IC0xKSB7XG4gICAgICAgIC8vIGNocm9tZS5zb2NrZXRzLnRjcC5zZWN1cmUgaXMgbm90IGZ1bmN0aW9uYWwgb24gY29yZG92YVxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vTW9iaWxlQ2hyb21lQXBwcy9tb2JpbGUtY2hyb21lLWFwcHMvaXNzdWVzLzI2OVxuICAgICAgICB0aGlzLl91c2VMZWdhY3lTb2NrZXQgPSBmYWxzZVxuICAgICAgICB0aGlzLl91c2VGb3JnZVRscyA9IHRydWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3VzZUxlZ2FjeVNvY2tldCA9IHRydWVcbiAgICAgICAgdGhpcy5fdXNlRm9yZ2VUbHMgPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fdXNlTGVnYWN5U29ja2V0KSB7XG4gICAgICAgIHRoaXMuX2NyZWF0ZUxlZ2FjeVNvY2tldCgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jcmVhdGVTb2NrZXQoKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNvY2tldCB1c2luZyB0aGUgZGVwcmVjYXRlZCBjaHJvbWUuc29ja2V0IEFQSVxuICAgKi9cbiAgX2NyZWF0ZUxlZ2FjeVNvY2tldCAoKSB7XG4gICAgY2hyb21lLnNvY2tldC5jcmVhdGUoJ3RjcCcsIHt9LCBjcmVhdGVJbmZvID0+IHtcbiAgICAgIHRoaXMuX3NvY2tldElkID0gY3JlYXRlSW5mby5zb2NrZXRJZFxuXG4gICAgICBjaHJvbWUuc29ja2V0LmNvbm5lY3QodGhpcy5fc29ja2V0SWQsIHRoaXMuaG9zdCwgdGhpcy5wb3J0LCByZXN1bHQgPT4ge1xuICAgICAgICBpZiAocmVzdWx0ICE9PSAwKSB7XG4gICAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NlZCdcbiAgICAgICAgICB0aGlzLl9lbWl0KCdlcnJvcicsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcilcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX29uU29ja2V0Q29ubmVjdGVkKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc29ja2V0IHVzaW5nIGNocm9tZS5zb2NrZXRzLnRjcFxuICAgKi9cbiAgX2NyZWF0ZVNvY2tldCAoKSB7XG4gICAgY2hyb21lLnNvY2tldHMudGNwLmNyZWF0ZSh7fSwgY3JlYXRlSW5mbyA9PiB7XG4gICAgICB0aGlzLl9zb2NrZXRJZCA9IGNyZWF0ZUluZm8uc29ja2V0SWRcblxuICAgICAgLy8gcmVnaXN0ZXIgZm9yIGRhdGEgZXZlbnRzIG9uIHRoZSBzb2NrZXQgYmVmb3JlIGNvbm5lY3RpbmdcbiAgICAgIGNocm9tZS5zb2NrZXRzLnRjcC5vblJlY2VpdmUuYWRkTGlzdGVuZXIocmVhZEluZm8gPT4ge1xuICAgICAgICBpZiAocmVhZEluZm8uc29ja2V0SWQgPT09IHRoaXMuX3NvY2tldElkKSB7XG4gICAgICAgICAgLy8gcHJvY2VzcyB0aGUgZGF0YSBhdmFpbGFibGUgb24gdGhlIHNvY2tldFxuICAgICAgICAgIHRoaXMuX29uRGF0YShyZWFkSW5mby5kYXRhKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyByZWdpc3RlciBmb3IgZGF0YSBlcnJvciBvbiB0aGUgc29ja2V0IGJlZm9yZSBjb25uZWN0aW5nXG4gICAgICBjaHJvbWUuc29ja2V0cy50Y3Aub25SZWNlaXZlRXJyb3IuYWRkTGlzdGVuZXIocmVhZEluZm8gPT4ge1xuICAgICAgICBpZiAocmVhZEluZm8uc29ja2V0SWQgPT09IHRoaXMuX3NvY2tldElkKSB7XG4gICAgICAgICAgLy8gc29ja2V0IGNsb3NlZCByZW1vdGVseSBvciBicm9rZW5cbiAgICAgICAgICB0aGlzLmNsb3NlKClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgY2hyb21lLnNvY2tldHMudGNwLnNldFBhdXNlZCh0aGlzLl9zb2NrZXRJZCwgdHJ1ZSwgKCkgPT4ge1xuICAgICAgICBjaHJvbWUuc29ja2V0cy50Y3AuY29ubmVjdCh0aGlzLl9zb2NrZXRJZCwgdGhpcy5ob3N0LCB0aGlzLnBvcnQsIHJlc3VsdCA9PiB7XG4gICAgICAgICAgaWYgKHJlc3VsdCA8IDApIHtcbiAgICAgICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9ICdjbG9zZWQnXG4gICAgICAgICAgICB0aGlzLl9lbWl0KCdlcnJvcicsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcilcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuX29uU29ja2V0Q29ubmVjdGVkKClcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnZva2VkIG9uY2UgYSBzb2NrZXQgaGFzIGJlZW4gY29ubmVjdGVkOlxuICAgKiAtIEtpY2tzIG9mZiBUTFMgaGFuZHNoYWtlLCBpZiBuZWNlc3NhcnlcbiAgICogLSBTdGFydHMgcmVhZGluZyBmcm9tIGxlZ2FjeSBzb2NrZXQsIGlmIG5lY2Vzc2FyeVxuICAgKi9cbiAgX29uU29ja2V0Q29ubmVjdGVkICgpIHtcbiAgICBjb25zdCByZWFkID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuX3VzZUxlZ2FjeVNvY2tldCkge1xuICAgICAgICAvLyB0aGUgdGxzIGhhbmRzaGFrZSBpcyBkb25lIGxldCdzIHN0YXJ0IHJlYWRpbmcgZnJvbSB0aGUgbGVnYWN5IHNvY2tldFxuICAgICAgICB0aGlzLl9yZWFkTGVnYWN5U29ja2V0KClcbiAgICAgICAgdGhpcy5fZW1pdCgnb3BlbicpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaHJvbWUuc29ja2V0cy50Y3Auc2V0UGF1c2VkKHRoaXMuX3NvY2tldElkLCBmYWxzZSwgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX2VtaXQoJ29wZW4nKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5fdXNlVExTKSB7XG4gICAgICByZXR1cm4gcmVhZCgpXG4gICAgfVxuXG4gICAgLy8gZG8gYW4gaW1tZWRpYXRlIFRMUyBoYW5kc2hha2UgaWYgdGhpcy5fdXNlVExTID09PSB0cnVlXG4gICAgdGhpcy5fdXBncmFkZVRvU2VjdXJlKCgpID0+IHsgcmVhZCgpIH0pXG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgcm91Z2ggZWRnZXMgZm9yIGRpZmZlcmVuY2VzIGJldHdlZW4gY2hyb21lLnNvY2tldCBhbmQgY2hyb21lLnNvY2tldHMudGNwXG4gICAqIGZvciB1cGdyYWRpbmcgdG8gYSBUTFMgY29ubmVjdGlvbiB3aXRoIG9yIHdpdGhvdXQgZm9yZ2VcbiAgICovXG4gIF91cGdyYWRlVG9TZWN1cmUgKGNhbGxiYWNrID0gKCkgPT4ge30pIHtcbiAgICAvLyBpbnZva2VkIGFmdGVyIGNocm9tZS5zb2NrZXQuc2VjdXJlIG9yIGNocm9tZS5zb2NrZXRzLnRjcC5zZWN1cmUgaGF2ZSBiZWVuIHVwZ3JhZGVkXG4gICAgY29uc3Qgb25VcGdyYWRlZCA9IHRsc1Jlc3VsdCA9PiB7XG4gICAgICBpZiAodGxzUmVzdWx0ICE9PSAwKSB7XG4gICAgICAgIHRoaXMuX2VtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdUTFMgaGFuZHNoYWtlIGZhaWxlZC4gUmVhc29uOiAnICsgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKVxuICAgICAgICB0aGlzLmNsb3NlKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHRoaXMuc3NsID0gdHJ1ZVxuXG4gICAgICAvLyBlbXB0eSB0aGUgYnVmZmVyXG4gICAgICB3aGlsZSAodGhpcy5fc3RhcnRUbHNCdWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuc2VuZCh0aGlzLl9zdGFydFRsc0J1ZmZlci5zaGlmdCgpKVxuICAgICAgfVxuXG4gICAgICBjYWxsYmFjaygpXG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl91c2VMZWdhY3lTb2NrZXQgJiYgdGhpcy5yZWFkeVN0YXRlICE9PSAnb3BlbicpIHtcbiAgICAgIC8vIHVzZSBjaHJvbWUuc29ja2V0cy50Y3Auc2VjdXJlIGZvciBUTFMsIG5vdCBmb3IgU1RBUlRUTFMhXG4gICAgICAvLyB1c2UgZm9yZ2Ugb25seSBmb3IgU1RBUlRUTFNcbiAgICAgIHRoaXMuX3VzZUZvcmdlVGxzID0gZmFsc2VcbiAgICAgIGNocm9tZS5zb2NrZXRzLnRjcC5zZWN1cmUodGhpcy5fc29ja2V0SWQsIG9uVXBncmFkZWQpXG4gICAgfSBlbHNlIGlmICh0aGlzLl91c2VMZWdhY3lTb2NrZXQpIHtcbiAgICAgIGNocm9tZS5zb2NrZXQuc2VjdXJlKHRoaXMuX3NvY2tldElkLCBvblVwZ3JhZGVkKVxuICAgIH0gZWxzZSBpZiAodGhpcy5fdXNlRm9yZ2VUbHMpIHtcbiAgICAgIC8vIHNldHVwIHRoZSBmb3JnZSB0bHMgY2xpZW50IG9yIHdlYndvcmtlciBhcyB0bHMgZmFsbGJhY2tcbiAgICAgIGNyZWF0ZVRscyh0aGlzKVxuICAgICAgY2FsbGJhY2soKVxuICAgIH1cbiAgfVxuXG4gIHVwZ3JhZGVUb1NlY3VyZSAoKSB7XG4gICAgaWYgKHRoaXMuc3NsIHx8IHRoaXMuX3VzZVNUQVJUVExTKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB0aGlzLl91c2VTVEFSVFRMUyA9IHRydWVcbiAgICB0aGlzLl91cGdyYWRlVG9TZWN1cmUoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuX3VzZUxlZ2FjeVNvY2tldCkge1xuICAgICAgICB0aGlzLl9yZWFkTGVnYWN5U29ja2V0KCkgLy8gdGxzIGhhbmRzaGFrZSBpcyBkb25lLCByZXN0YXJ0IHJlYWRpbmdcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFJlYWRzIGZyb20gYSBsZWdhY3kgY2hyb21lLnNvY2tldC5cbiAgICovXG4gIF9yZWFkTGVnYWN5U29ja2V0ICgpIHtcbiAgICBpZiAodGhpcy5fc29ja2V0SWQgPT09IDApIHtcbiAgICAgIC8vIHRoZSBzb2NrZXQgaXMgY2xvc2VkLiBvbWl0IHJlYWQgYW5kIHN0b3AgZnVydGhlciByZWFkc1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gZG9uJ3QgcmVhZCBmcm9tIGNocm9tZS5zb2NrZXQgaWYgd2UgaGF2ZSBjaHJvbWUuc29ja2V0LnNlY3VyZSBhIGhhbmRzaGFrZSBpbiBwcm9ncmVzcyFcbiAgICBpZiAoKHRoaXMuX3VzZVNUQVJUVExTIHx8IHRoaXMuX3VzZVRMUykgJiYgIXRoaXMuc3NsKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjaHJvbWUuc29ja2V0LnJlYWQodGhpcy5fc29ja2V0SWQsIHJlYWRJbmZvID0+IHtcbiAgICAgIC8vIHNvY2tldCBjbG9zZWQgcmVtb3RlbHkgb3IgYnJva2VuXG4gICAgICBpZiAocmVhZEluZm8ucmVzdWx0Q29kZSA8PSAwKSB7XG4gICAgICAgIHRoaXMuX3NvY2tldElkID0gMFxuICAgICAgICB0aGlzLmNsb3NlKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIHByb2Nlc3MgdGhlIGRhdGEgYXZhaWxhYmxlIG9uIHRoZSBzb2NrZXRcbiAgICAgIHRoaXMuX29uRGF0YShyZWFkSW5mby5kYXRhKVxuXG4gICAgICAvLyBRdWV1ZSB0aGUgbmV4dCByZWFkLlxuICAgICAgLy8gSWYgYSBTVEFSVFRMUyBoYW5kc2hha2UgbWlnaHQgYmUgdXBjb21pbmcsIHBvc3Rwb25lIHRoaXMgb250b1xuICAgICAgLy8gdGhlIHRhc2sgcXVldWUgc28gdGhlIElNQVAgY2xpZW50IGhhcyBhIGNoYW5jZSB0byBjYWxsIHVwZ3JhZGVUb1NlY3VyZTtcbiAgICAgIC8vIHdpdGhvdXQgdGhpcywgd2UgbWlnaHQgZWF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGhhbmRzaGFrZS5cbiAgICAgIC8vIElmIHdlIGFyZSBhbHJlYWR5IHNlY3VyZSwganVzdCBjYWxsIGl0IChmb3IgcGVyZm9ybWFuY2UpLlxuICAgICAgaWYgKHRoaXMuc3NsKSB7XG4gICAgICAgIHRoaXMuX3JlYWRMZWdhY3lTb2NrZXQoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2NoZWR1bGVJbk5leHRFdmVudExvb3AoKCkgPT4gdGhpcy5fcmVhZExlZ2FjeVNvY2tldCgpKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogSW52b2tlZCB3aGVuIGRhdGEgaGFzIGJlZW4gcmVhZCBmcm9tIHRoZSBzb2NrZXQuIEhhbmRsZXMgY2FzZXMgd2hlbiB0byBmZWVkXG4gICAqIHRoZSBkYXRhIGF2YWlsYWJsZSBvbiB0aGUgc29ja2V0IHRvIGZvcmdlLlxuICAgKlxuICAgKiBAcGFyYW0ge0FycmF5QnVmZmVyfSBidWZmZXIgVGhlIGJpbmFyeSBkYXRhIHJlYWQgZnJvbSB0aGUgc29ja2V0XG4gICAqL1xuICBfb25EYXRhIChidWZmZXIpIHtcbiAgICBpZiAoKHRoaXMuX3VzZVRMUyB8fCB0aGlzLl91c2VTVEFSVFRMUykgJiYgdGhpcy5fdXNlRm9yZ2VUbHMpIHtcbiAgICAgIC8vIGZlZWQgdGhlIGRhdGEgdG8gdGhlIHRscyBjbGllbnRcbiAgICAgIGlmICh0aGlzLl90bHNXb3JrZXIpIHtcbiAgICAgICAgdGhpcy5fdGxzV29ya2VyLnBvc3RNZXNzYWdlKGNyZWF0ZU1lc3NhZ2UoRVZFTlRfSU5CT1VORCwgYnVmZmVyKSwgW2J1ZmZlcl0pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl90bHMucHJvY2Vzc0luYm91bmQoYnVmZmVyKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBlbWl0IGRhdGEgZXZlbnRcbiAgICAgIHRoaXMuX2VtaXQoJ2RhdGEnLCBidWZmZXIpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgc29ja2V0XG4gICAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuICAgKi9cbiAgY2xvc2UgKCkge1xuICAgIHRoaXMucmVhZHlTdGF0ZSA9ICdjbG9zaW5nJ1xuXG4gICAgaWYgKHRoaXMuX3NvY2tldElkICE9PSAwKSB7XG4gICAgICBpZiAodGhpcy5fdXNlTGVnYWN5U29ja2V0KSB7XG4gICAgICAgIC8vIGNsb3NlIGxlZ2FjeSBzb2NrZXRcbiAgICAgICAgY2hyb21lLnNvY2tldC5kaXNjb25uZWN0KHRoaXMuX3NvY2tldElkKVxuICAgICAgICBjaHJvbWUuc29ja2V0LmRlc3Ryb3kodGhpcy5fc29ja2V0SWQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjbG9zZSBzb2NrZXRcbiAgICAgICAgY2hyb21lLnNvY2tldHMudGNwLmRpc2Nvbm5lY3QodGhpcy5fc29ja2V0SWQpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3NvY2tldElkID0gMFxuICAgIH1cblxuICAgIC8vIHRlcm1pbmF0ZSB0aGUgdGxzIHdvcmtlclxuICAgIGlmICh0aGlzLl90bHNXb3JrZXIpIHtcbiAgICAgIHRoaXMuX3Rsc1dvcmtlci50ZXJtaW5hdGUoKVxuICAgICAgdGhpcy5fdGxzV29ya2VyID0gdW5kZWZpbmVkXG4gICAgfVxuXG4gICAgdGhpcy5fZW1pdCgnY2xvc2UnKVxuICB9XG5cbiAgc2VuZCAoYnVmZmVyKSB7XG4gICAgaWYgKCF0aGlzLl91c2VGb3JnZVRscyAmJiB0aGlzLl91c2VTVEFSVFRMUyAmJiAhdGhpcy5zc2wpIHtcbiAgICAgIC8vIGJ1ZmZlciB0aGUgdW5wcmVwYXJlZCBkYXRhIHVudGlsIGNocm9tZS5zb2NrZXQocy50Y3ApIGhhbmRzaGFrZSBpcyBkb25lXG4gICAgICB0aGlzLl9zdGFydFRsc0J1ZmZlci5wdXNoKGJ1ZmZlcilcbiAgICB9IGVsc2UgaWYgKHRoaXMuX3VzZUZvcmdlVGxzICYmICh0aGlzLl91c2VUTFMgfHwgdGhpcy5fdXNlU1RBUlRUTFMpKSB7XG4gICAgICAvLyBnaXZlIGJ1ZmZlciB0byBmb3JnZSB0byBiZSBwcmVwYXJlZCBmb3IgdGxzXG4gICAgICBpZiAodGhpcy5fdGxzV29ya2VyKSB7XG4gICAgICAgIHRoaXMuX3Rsc1dvcmtlci5wb3N0TWVzc2FnZShjcmVhdGVNZXNzYWdlKEVWRU5UX09VVEJPVU5ELCBidWZmZXIpLCBbYnVmZmVyXSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Rscy5wcmVwYXJlT3V0Ym91bmQoYnVmZmVyKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzZW5kIHRoZSBhcnJheWJ1ZmZlclxuICAgICAgdGhpcy5fc2VuZChidWZmZXIpXG4gICAgfVxuICB9XG5cbiAgX3NlbmQgKGRhdGEpIHtcbiAgICBpZiAodGhpcy5fc29ja2V0SWQgPT09IDApIHtcbiAgICAgIC8vIHRoZSBzb2NrZXQgaXMgY2xvc2VkLlxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3VzZUxlZ2FjeVNvY2tldCkge1xuICAgICAgY2hyb21lLnNvY2tldC53cml0ZSh0aGlzLl9zb2NrZXRJZCwgZGF0YSwgd3JpdGVJbmZvID0+IHtcbiAgICAgICAgaWYgKHdyaXRlSW5mby5ieXRlc1dyaXR0ZW4gPCAwICYmIHRoaXMuX3NvY2tldElkICE9PSAwKSB7XG4gICAgICAgICAgLy8gaWYgdGhlIHNvY2tldCBpcyBhbHJlYWR5IDAsIGl0IGhhcyBhbHJlYWR5IGJlZW4gY2xvc2VkLiBubyBuZWVkIHRvIGFsZXJ0IHRoZW4uLi5cbiAgICAgICAgICB0aGlzLl9lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignQ291bGQgbm90IHdyaXRlICcgKyBkYXRhLmJ5dGVMZW5ndGggKyAnIGJ5dGVzIHRvIHNvY2tldCAnICsgdGhpcy5fc29ja2V0SWQgKyAnLiBDaHJvbWUgZXJyb3IgY29kZTogJyArIHdyaXRlSW5mby5ieXRlc1dyaXR0ZW4pKVxuICAgICAgICAgIHRoaXMuX3NvY2tldElkID0gMFxuICAgICAgICAgIHRoaXMuY2xvc2UoKVxuXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9lbWl0KCdkcmFpbicpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICBjaHJvbWUuc29ja2V0cy50Y3Auc2VuZCh0aGlzLl9zb2NrZXRJZCwgZGF0YSwgc2VuZEluZm8gPT4ge1xuICAgICAgICBpZiAoc2VuZEluZm8uYnl0ZXNTZW50IDwgMCAmJiB0aGlzLl9zb2NrZXRJZCAhPT0gMCkge1xuICAgICAgICAgIC8vIGlmIHRoZSBzb2NrZXQgaXMgYWxyZWFkeSAwLCBpdCBoYXMgYWxyZWFkeSBiZWVuIGNsb3NlZC4gbm8gbmVlZCB0byBhbGVydCB0aGVuLi4uXG4gICAgICAgICAgdGhpcy5fZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ0NvdWxkIG5vdCB3cml0ZSAnICsgZGF0YS5ieXRlTGVuZ3RoICsgJyBieXRlcyB0byBzb2NrZXQgJyArIHRoaXMuX3NvY2tldElkICsgJy4gQ2hyb21lIGVycm9yIGNvZGU6ICcgKyBzZW5kSW5mby5ieXRlc1NlbnQpKVxuICAgICAgICAgIHRoaXMuY2xvc2UoKVxuXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9lbWl0KCdkcmFpbicpXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIF9lbWl0ICh0eXBlLCBkYXRhKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpc1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnb3Blbic6XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9ICdvcGVuJ1xuICAgICAgICB0aGlzLm9ub3BlbiAmJiB0aGlzLm9ub3Blbih7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICB0aGlzLm9uZXJyb3IgJiYgdGhpcy5vbmVycm9yKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdkYXRhJzpcbiAgICAgICAgdGhpcy5vbmRhdGEgJiYgdGhpcy5vbmRhdGEoeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2RyYWluJzpcbiAgICAgICAgdGhpcy5vbmRyYWluICYmIHRoaXMub25kcmFpbih7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnY2xvc2UnOlxuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY2xvc2VkJ1xuICAgICAgICB0aGlzLm9uY2xvc2UgJiYgdGhpcy5vbmNsb3NlKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICB9XG59XG4iXX0=