'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ramda = require('ramda');

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

    this._wsHost = (0, _ramda.pathOr)(window.location.origin, ['ws', 'url'])(options);
    this._wsOptions = (0, _ramda.pathOr)({}, ['ws', 'options'])(options);
    this._wsOptions.reconnection = this._wsOptions.reconnection || false;
    this._wsOptions.multiplex = this._wsOptions.multiplex || false;

    this._socket = io(this._wsHost, this._wsOptions);
    this._socket.emit('open', { host: host, port: port }, function (proxyHostname) {
      _this._proxyHostname = proxyHostname;
      if (_this._useTLS) {
        // the socket is up, do the tls handshake
        (0, _tlsUtils2.default)(_this);
      } else {
        // socket is up and running
        _this._emit('open', {
          proxyHostname: _this._proxyHostname
        });
      }

      _this._socket.on('data', function (buffer) {
        if (_this._useTLS || _this._useSTARTTLS) {
          // feed the data to the tls socket
          if (_this._tlsWorker) {
            _this._tlsWorker.postMessage((0, _workerUtils.createMessage)(_workerUtils.EVENT_INBOUND, buffer), [buffer]);
          } else {
            _this._tls.processInbound(buffer);
          }
        } else {
          _this._emit('data', buffer);
        }
      });

      _this._socket.on('error', function (message) {
        _this._emit('error', new Error(message));
        _this.close();
      });

      _this._socket.on('close', function () {
        return _this.close();
      });
    });
  }

  _createClass(TCPSocket, [{
    key: 'close',
    value: function close() {
      this.readyState = 'closing';

      this._socket.emit('end');
      this._socket.disconnect();

      if (this._tlsWorker) {
        this._tlsWorker.terminate();
      }

      this._emit('close');
    }
  }, {
    key: 'send',
    value: function send(buffer) {
      if (this._useTLS || this._useSTARTTLS) {
        // give buffer to forge to be prepared for tls
        if (this._tlsWorker) {
          this._tlsWorker.postMessage((0, _workerUtils.createMessage)(_workerUtils.EVENT_OUTBOUND, buffer), [buffer]);
        } else {
          this._tls.prepareOutbound(buffer);
        }
        return;
      }

      this._send(buffer);
    }
  }, {
    key: '_send',
    value: function _send(data) {
      var _this2 = this;

      this._socket.emit('data', data, function () {
        return _this2._emit('drain');
      });
    }
  }, {
    key: 'upgradeToSecure',
    value: function upgradeToSecure() {
      if (this.ssl || this._useSTARTTLS) return;

      this._useSTARTTLS = true;
      (0, _tlsUtils2.default)(this);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zb2NrZXRpby1zb2NrZXQuanMiXSwibmFtZXMiOlsiVENQU29ja2V0IiwiaG9zdCIsInBvcnQiLCJvcHRpb25zIiwic3NsIiwiYnVmZmVyZWRBbW91bnQiLCJyZWFkeVN0YXRlIiwiYmluYXJ5VHlwZSIsIkVycm9yIiwiX2NhIiwiY2EiLCJfdXNlVExTIiwiX3VzZVNUQVJUVExTIiwiX3dzSG9zdCIsIndpbmRvdyIsImxvY2F0aW9uIiwib3JpZ2luIiwiX3dzT3B0aW9ucyIsInJlY29ubmVjdGlvbiIsIm11bHRpcGxleCIsIl9zb2NrZXQiLCJpbyIsImVtaXQiLCJfcHJveHlIb3N0bmFtZSIsInByb3h5SG9zdG5hbWUiLCJfZW1pdCIsIm9uIiwiX3Rsc1dvcmtlciIsInBvc3RNZXNzYWdlIiwiYnVmZmVyIiwiX3RscyIsInByb2Nlc3NJbmJvdW5kIiwibWVzc2FnZSIsImNsb3NlIiwiZGlzY29ubmVjdCIsInRlcm1pbmF0ZSIsInByZXBhcmVPdXRib3VuZCIsIl9zZW5kIiwiZGF0YSIsInR5cGUiLCJ0YXJnZXQiLCJvbm9wZW4iLCJvbmVycm9yIiwib25kYXRhIiwib25kcmFpbiIsIm9uY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0lBS3FCQSxTOzs7eUJBQ05DLEksRUFBTUMsSSxFQUFvQjtBQUFBLFVBQWRDLE9BQWMsdUVBQUosRUFBSTs7QUFDckMsYUFBTyxJQUFJSCxTQUFKLENBQWMsRUFBRUMsVUFBRixFQUFRQyxVQUFSLEVBQWNDLGdCQUFkLEVBQWQsQ0FBUDtBQUNEOzs7QUFFRCwyQkFBc0M7QUFBQTs7QUFBQSxRQUF2QkYsSUFBdUIsUUFBdkJBLElBQXVCO0FBQUEsUUFBakJDLElBQWlCLFFBQWpCQSxJQUFpQjtBQUFBLFFBQVhDLE9BQVcsUUFBWEEsT0FBVzs7QUFBQTs7QUFDcEMsU0FBS0YsSUFBTCxHQUFZQSxJQUFaO0FBQ0EsU0FBS0MsSUFBTCxHQUFZQSxJQUFaO0FBQ0EsU0FB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QUtNLE9BQUwsSUFBZ0IsS0FBS0EsT0FBTCxDQUFhLEVBQUVKLGNBQUYsRUFBVUQsVUFBVixFQUFnQkQsVUFBaEIsRUFBYixDQUFoQjtBQUNBO0FBQ0YsYUFBSyxPQUFMO0FBQ0UsZUFBS2hDLFVBQUwsR0FBa0IsUUFBbEI7QUFDQSxlQUFLdUMsT0FBTCxJQUFnQixLQUFLQSxPQUFMLENBQWEsRUFBRUwsY0FBRixFQUFVRCxVQUFWLEVBQWdCRCxVQUFoQixFQUFiLENBQWhCO0FBQ0E7QUFqQko7QUFtQkQ7Ozs7OztrQkF4SGtCdEMsUyIsImZpbGUiOiJzb2NrZXRpby1zb2NrZXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwYXRoT3IsIHByb3BPciB9IGZyb20gJ3JhbWRhJ1xuaW1wb3J0IGNyZWF0ZVRscyBmcm9tICcuL3Rscy11dGlscydcbmltcG9ydCB7XG4gIEVWRU5UX0lOQk9VTkQsIEVWRU5UX09VVEJPVU5ELFxuICBjcmVhdGVNZXNzYWdlXG59IGZyb20gJy4vd29ya2VyLXV0aWxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUQ1BTb2NrZXQge1xuICBzdGF0aWMgb3BlbiAoaG9zdCwgcG9ydCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIG5ldyBUQ1BTb2NrZXQoeyBob3N0LCBwb3J0LCBvcHRpb25zIH0pXG4gIH1cblxuICBjb25zdHJ1Y3RvciAoeyBob3N0LCBwb3J0LCBvcHRpb25zIH0pIHtcbiAgICB0aGlzLmhvc3QgPSBob3N0XG4gICAgdGhpcy5wb3J0ID0gcG9ydFxuICAgIHRoaXMuc3NsID0gZmFsc2VcbiAgICB0aGlzLmJ1ZmZlcmVkQW1vdW50ID0gMFxuICAgIHRoaXMucmVhZHlTdGF0ZSA9ICdjb25uZWN0aW5nJ1xuICAgIHRoaXMuYmluYXJ5VHlwZSA9IHByb3BPcignYXJyYXlidWZmZXInLCAnYmluYXJ5VHlwZScpKG9wdGlvbnMpXG5cbiAgICBpZiAodGhpcy5iaW5hcnlUeXBlICE9PSAnYXJyYXlidWZmZXInKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgYXJyYXlidWZmZXJzIGFyZSBzdXBwb3J0ZWQhJylcbiAgICB9XG5cbiAgICB0aGlzLl9jYSA9IG9wdGlvbnMuY2FcbiAgICB0aGlzLl91c2VUTFMgPSBwcm9wT3IoZmFsc2UsICd1c2VTZWN1cmVUcmFuc3BvcnQnKShvcHRpb25zKVxuICAgIHRoaXMuX3VzZVNUQVJUVExTID0gZmFsc2VcblxuICAgIHRoaXMuX3dzSG9zdCA9IHBhdGhPcih3aW5kb3cubG9jYXRpb24ub3JpZ2luLCBbJ3dzJywgJ3VybCddKShvcHRpb25zKVxuICAgIHRoaXMuX3dzT3B0aW9ucyA9IHBhdGhPcih7fSwgWyd3cycsICdvcHRpb25zJ10pKG9wdGlvbnMpXG4gICAgdGhpcy5fd3NPcHRpb25zLnJlY29ubmVjdGlvbiA9IHRoaXMuX3dzT3B0aW9ucy5yZWNvbm5lY3Rpb24gfHwgZmFsc2VcbiAgICB0aGlzLl93c09wdGlvbnMubXVsdGlwbGV4ID0gdGhpcy5fd3NPcHRpb25zLm11bHRpcGxleCB8fCBmYWxzZVxuXG4gICAgdGhpcy5fc29ja2V0ID0gaW8odGhpcy5fd3NIb3N0LCB0aGlzLl93c09wdGlvbnMpXG4gICAgdGhpcy5fc29ja2V0LmVtaXQoJ29wZW4nLCB7IGhvc3QsIHBvcnQgfSwgcHJveHlIb3N0bmFtZSA9PiB7XG4gICAgICB0aGlzLl9wcm94eUhvc3RuYW1lID0gcHJveHlIb3N0bmFtZVxuICAgICAgaWYgKHRoaXMuX3VzZVRMUykge1xuICAgICAgICAvLyB0aGUgc29ja2V0IGlzIHVwLCBkbyB0aGUgdGxzIGhhbmRzaGFrZVxuICAgICAgICBjcmVhdGVUbHModGhpcylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNvY2tldCBpcyB1cCBhbmQgcnVubmluZ1xuICAgICAgICB0aGlzLl9lbWl0KCdvcGVuJywge1xuICAgICAgICAgIHByb3h5SG9zdG5hbWU6IHRoaXMuX3Byb3h5SG9zdG5hbWVcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5fc29ja2V0Lm9uKCdkYXRhJywgYnVmZmVyID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX3VzZVRMUyB8fCB0aGlzLl91c2VTVEFSVFRMUykge1xuICAgICAgICAgIC8vIGZlZWQgdGhlIGRhdGEgdG8gdGhlIHRscyBzb2NrZXRcbiAgICAgICAgICBpZiAodGhpcy5fdGxzV29ya2VyKSB7XG4gICAgICAgICAgICB0aGlzLl90bHNXb3JrZXIucG9zdE1lc3NhZ2UoY3JlYXRlTWVzc2FnZShFVkVOVF9JTkJPVU5ELCBidWZmZXIpLCBbYnVmZmVyXSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fdGxzLnByb2Nlc3NJbmJvdW5kKGJ1ZmZlcilcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZW1pdCgnZGF0YScsIGJ1ZmZlcilcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdGhpcy5fc29ja2V0Lm9uKCdlcnJvcicsIG1lc3NhZ2UgPT4ge1xuICAgICAgICB0aGlzLl9lbWl0KCdlcnJvcicsIG5ldyBFcnJvcihtZXNzYWdlKSlcbiAgICAgICAgdGhpcy5jbG9zZSgpXG4gICAgICB9KVxuXG4gICAgICB0aGlzLl9zb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4gdGhpcy5jbG9zZSgpKVxuICAgIH0pXG4gIH1cblxuICBjbG9zZSAoKSB7XG4gICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NpbmcnXG5cbiAgICB0aGlzLl9zb2NrZXQuZW1pdCgnZW5kJylcbiAgICB0aGlzLl9zb2NrZXQuZGlzY29ubmVjdCgpXG5cbiAgICBpZiAodGhpcy5fdGxzV29ya2VyKSB7XG4gICAgICB0aGlzLl90bHNXb3JrZXIudGVybWluYXRlKClcbiAgICB9XG5cbiAgICB0aGlzLl9lbWl0KCdjbG9zZScpXG4gIH1cblxuICBzZW5kIChidWZmZXIpIHtcbiAgICBpZiAodGhpcy5fdXNlVExTIHx8IHRoaXMuX3VzZVNUQVJUVExTKSB7XG4gICAgICAvLyBnaXZlIGJ1ZmZlciB0byBmb3JnZSB0byBiZSBwcmVwYXJlZCBmb3IgdGxzXG4gICAgICBpZiAodGhpcy5fdGxzV29ya2VyKSB7XG4gICAgICAgIHRoaXMuX3Rsc1dvcmtlci5wb3N0TWVzc2FnZShjcmVhdGVNZXNzYWdlKEVWRU5UX09VVEJPVU5ELCBidWZmZXIpLCBbYnVmZmVyXSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Rscy5wcmVwYXJlT3V0Ym91bmQoYnVmZmVyKVxuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5fc2VuZChidWZmZXIpXG4gIH1cblxuICBfc2VuZCAoZGF0YSkge1xuICAgIHRoaXMuX3NvY2tldC5lbWl0KCdkYXRhJywgZGF0YSwgKCkgPT4gdGhpcy5fZW1pdCgnZHJhaW4nKSlcbiAgfVxuXG4gIHVwZ3JhZGVUb1NlY3VyZSAoKSB7XG4gICAgaWYgKHRoaXMuc3NsIHx8IHRoaXMuX3VzZVNUQVJUVExTKSByZXR1cm5cblxuICAgIHRoaXMuX3VzZVNUQVJUVExTID0gdHJ1ZVxuICAgIGNyZWF0ZVRscyh0aGlzKVxuICB9XG5cbiAgX2VtaXQgKHR5cGUsIGRhdGEpIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlICdvcGVuJzpcbiAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gJ29wZW4nXG4gICAgICAgIHRoaXMub25vcGVuICYmIHRoaXMub25vcGVuKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgIHRoaXMub25lcnJvciAmJiB0aGlzLm9uZXJyb3IoeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2RhdGEnOlxuICAgICAgICB0aGlzLm9uZGF0YSAmJiB0aGlzLm9uZGF0YSh7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZHJhaW4nOlxuICAgICAgICB0aGlzLm9uZHJhaW4gJiYgdGhpcy5vbmRyYWluKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdjbG9zZSc6XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9ICdjbG9zZWQnXG4gICAgICAgIHRoaXMub25jbG9zZSAmJiB0aGlzLm9uY2xvc2UoeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbn1cbiJdfQ==