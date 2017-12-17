'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ramda = require('ramda');

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _tls = require('tls');

var _tls2 = _interopRequireDefault(_tls);

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
    this.ssl = (0, _ramda.propOr)(false, 'useSecureTransport')(options);
    this.bufferedAmount = 0;
    this.readyState = 'connecting';
    this.binaryType = (0, _ramda.propOr)('arraybuffer', 'binaryType')(options);

    if (this.binaryType !== 'arraybuffer') {
      throw new Error('Only arraybuffers are supported!');
    }

    this._socket = this.ssl ? _tls2.default.connect(this.port, this.host, {}, function () {
      return _this._emit('open');
    }) : _net2.default.connect(this.port, this.host, function () {
      return _this._emit('open');
    });

    // add all event listeners to the new socket
    this._attachListeners();
  }

  _createClass(TCPSocket, [{
    key: '_attachListeners',
    value: function _attachListeners() {
      var _this2 = this;

      this._socket.on('data', function (nodeBuf) {
        return _this2._emit('data', nodeBuffertoArrayBuffer(nodeBuf));
      });
      this._socket.on('error', function (error) {
        // Ignore ECONNRESET errors. For the app this is the same as normal close
        if (error.code !== 'ECONNRESET') {
          _this2._emit('error', error);
        }
        _this2.close();
      });

      this._socket.on('end', function () {
        return _this2._emit('close');
      });
    }
  }, {
    key: '_removeListeners',
    value: function _removeListeners() {
      this._socket.removeAllListeners('data');
      this._socket.removeAllListeners('end');
      this._socket.removeAllListeners('error');
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

    //
    // API
    //

  }, {
    key: 'close',
    value: function close() {
      this.readyState = 'closing';
      this._socket.end();
    }
  }, {
    key: 'send',
    value: function send(data) {
      // convert data to string or node buffer
      this._socket.write(arrayBufferToNodeBuffer(data), this._emit.bind(this, 'drain'));
    }
  }, {
    key: 'upgradeToSecure',
    value: function upgradeToSecure() {
      var _this3 = this;

      if (this.ssl) return;

      this._removeListeners();
      this._socket = _tls2.default.connect({ socket: this._socket }, function () {
        _this3.ssl = true;
      });
      this._attachListeners();
    }
  }]);

  return TCPSocket;
}();

exports.default = TCPSocket;


var nodeBuffertoArrayBuffer = function nodeBuffertoArrayBuffer(buf) {
  return Uint8Array.from(buf).buffer;
};
var arrayBufferToNodeBuffer = function arrayBufferToNodeBuffer(ab) {
  return Buffer.from(new Uint8Array(ab));
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ub2RlLXNvY2tldC5qcyJdLCJuYW1lcyI6WyJUQ1BTb2NrZXQiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJzc2wiLCJidWZmZXJlZEFtb3VudCIsInJlYWR5U3RhdGUiLCJiaW5hcnlUeXBlIiwiRXJyb3IiLCJfc29ja2V0IiwiY29ubmVjdCIsIl9lbWl0IiwiX2F0dGFjaExpc3RlbmVycyIsIm9uIiwibm9kZUJ1ZmZlcnRvQXJyYXlCdWZmZXIiLCJub2RlQnVmIiwiZXJyb3IiLCJjb2RlIiwiY2xvc2UiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJ0eXBlIiwiZGF0YSIsInRhcmdldCIsIm9ub3BlbiIsIm9uZXJyb3IiLCJvbmRhdGEiLCJvbmRyYWluIiwib25jbG9zZSIsImVuZCIsIndyaXRlIiwiYXJyYXlCdWZmZXJUb05vZGVCdWZmZXIiLCJiaW5kIiwiX3JlbW92ZUxpc3RlbmVycyIsInNvY2tldCIsIlVpbnQ4QXJyYXkiLCJmcm9tIiwiYnVmIiwiYnVmZmVyIiwiYWIiLCJCdWZmZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7SUFFcUJBLFM7Ozt5QkFDTkMsSSxFQUFNQyxJLEVBQW9CO0FBQUEsVUFBZEMsT0FBYyx1RUFBSixFQUFJOztBQUNyQyxhQUFPLElBQUlILFNBQUosQ0FBYyxFQUFFQyxVQUFGLEVBQVFDLFVBQVIsRUFBY0MsZ0JBQWQsRUFBZCxDQUFQO0FBQ0Q7OztBQUVELDJCQUFzQztBQUFBOztBQUFBLFFBQXZCRixJQUF1QixRQUF2QkEsSUFBdUI7QUFBQSxRQUFqQkMsSUFBaUIsUUFBakJBLElBQWlCO0FBQUEsUUFBWEMsT0FBVyxRQUFYQSxPQUFXOztBQUFBOztBQUNwQyxTQUFLRixJQUFMLEdBQVlBLElBQVo7QUFDQSxTQUFLQyxJQUFMLEdBQVlBLElBQVo7QUFDQSxTQUFLRSxHQUFMLEdBQVcsbUJBQU8sS0FBUCxFQUFjLG9CQUFkLEVBQW9DRCxPQUFwQyxDQUFYO0FBQ0Es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YW9CLEtBQWIsQ0FBbUJDLHdCQUF3QlQsSUFBeEIsQ0FBbkIsRUFBa0QsS0FBS1YsS0FBTCxDQUFXb0IsSUFBWCxDQUFnQixJQUFoQixFQUFzQixPQUF0QixDQUFsRDtBQUNEOzs7c0NBRWtCO0FBQUE7O0FBQ2pCLFVBQUksS0FBSzNCLEdBQVQsRUFBYzs7QUFFZCxXQUFLNEIsZ0JBQUw7QUFDQSxXQUFLdkIsT0FBTCxHQUFlLGNBQUlDLE9BQUosQ0FBWSxFQUFFdUIsUUFBUSxLQUFLeEIsT0FBZixFQUFaLEVBQXNDLFlBQU07QUFBRSxlQUFLTCxHQUFMLEdBQVcsSUFBWDtBQUFpQixPQUEvRCxDQUFmO0FBQ0EsV0FBS1EsZ0JBQUw7QUFDRDs7Ozs7O2tCQXZGa0JaLFM7OztBQTBGckIsSUFBTWMsMEJBQTBCLFNBQTFCQSx1QkFBMEI7QUFBQSxTQUFPb0IsV0FBV0MsSUFBWCxDQUFnQkMsR0FBaEIsRUFBcUJDLE1BQTVCO0FBQUEsQ0FBaEM7QUFDQSxJQUFNUCwwQkFBMEIsU0FBMUJBLHVCQUEwQixDQUFDUSxFQUFEO0FBQUEsU0FBUUMsT0FBT0osSUFBUCxDQUFZLElBQUlELFVBQUosQ0FBZUksRUFBZixDQUFaLENBQVI7QUFBQSxDQUFoQyIsImZpbGUiOiJub2RlLXNvY2tldC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHByb3BPciB9IGZyb20gJ3JhbWRhJ1xuaW1wb3J0IG5ldCBmcm9tICduZXQnXG5pbXBvcnQgdGxzIGZyb20gJ3RscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVENQU29ja2V0IHtcbiAgc3RhdGljIG9wZW4gKGhvc3QsIHBvcnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiBuZXcgVENQU29ja2V0KHsgaG9zdCwgcG9ydCwgb3B0aW9ucyB9KVxuICB9XG5cbiAgY29uc3RydWN0b3IgKHsgaG9zdCwgcG9ydCwgb3B0aW9ucyB9KSB7XG4gICAgdGhpcy5ob3N0ID0gaG9zdFxuICAgIHRoaXMucG9ydCA9IHBvcnRcbiAgICB0aGlzLnNzbCA9IHByb3BPcihmYWxzZSwgJ3VzZVNlY3VyZVRyYW5zcG9ydCcpKG9wdGlvbnMpXG4gICAgdGhpcy5idWZmZXJlZEFtb3VudCA9IDBcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY29ubmVjdGluZydcbiAgICB0aGlzLmJpbmFyeVR5cGUgPSBwcm9wT3IoJ2FycmF5YnVmZmVyJywgJ2JpbmFyeVR5cGUnKShvcHRpb25zKVxuXG4gICAgaWYgKHRoaXMuYmluYXJ5VHlwZSAhPT0gJ2FycmF5YnVmZmVyJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IGFycmF5YnVmZmVycyBhcmUgc3VwcG9ydGVkIScpXG4gICAgfVxuXG4gICAgdGhpcy5fc29ja2V0ID0gdGhpcy5zc2xcbiAgICAgID8gdGxzLmNvbm5lY3QodGhpcy5wb3J0LCB0aGlzLmhvc3QsIHsgfSwgKCkgPT4gdGhpcy5fZW1pdCgnb3BlbicpKVxuICAgICAgOiBuZXQuY29ubmVjdCh0aGlzLnBvcnQsIHRoaXMuaG9zdCwgKCkgPT4gdGhpcy5fZW1pdCgnb3BlbicpKVxuXG4gICAgLy8gYWRkIGFsbCBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIG5ldyBzb2NrZXRcbiAgICB0aGlzLl9hdHRhY2hMaXN0ZW5lcnMoKVxuICB9XG5cbiAgX2F0dGFjaExpc3RlbmVycyAoKSB7XG4gICAgdGhpcy5fc29ja2V0Lm9uKCdkYXRhJywgbm9kZUJ1ZiA9PiB0aGlzLl9lbWl0KCdkYXRhJywgbm9kZUJ1ZmZlcnRvQXJyYXlCdWZmZXIobm9kZUJ1ZikpKVxuICAgIHRoaXMuX3NvY2tldC5vbignZXJyb3InLCBlcnJvciA9PiB7XG4gICAgICAvLyBJZ25vcmUgRUNPTk5SRVNFVCBlcnJvcnMuIEZvciB0aGUgYXBwIHRoaXMgaXMgdGhlIHNhbWUgYXMgbm9ybWFsIGNsb3NlXG4gICAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ0VDT05OUkVTRVQnKSB7XG4gICAgICAgIHRoaXMuX2VtaXQoJ2Vycm9yJywgZXJyb3IpXG4gICAgICB9XG4gICAgICB0aGlzLmNsb3NlKClcbiAgICB9KVxuXG4gICAgdGhpcy5fc29ja2V0Lm9uKCdlbmQnLCAoKSA9PiB0aGlzLl9lbWl0KCdjbG9zZScpKVxuICB9XG5cbiAgX3JlbW92ZUxpc3RlbmVycyAoKSB7XG4gICAgdGhpcy5fc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnZGF0YScpXG4gICAgdGhpcy5fc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnZW5kJylcbiAgICB0aGlzLl9zb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKCdlcnJvcicpXG4gIH1cblxuICBfZW1pdCAodHlwZSwgZGF0YSkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXNcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ29wZW4nOlxuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSAnb3BlbidcbiAgICAgICAgdGhpcy5vbm9wZW4gJiYgdGhpcy5vbm9wZW4oeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgdGhpcy5vbmVycm9yICYmIHRoaXMub25lcnJvcih7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZGF0YSc6XG4gICAgICAgIHRoaXMub25kYXRhICYmIHRoaXMub25kYXRhKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdkcmFpbic6XG4gICAgICAgIHRoaXMub25kcmFpbiAmJiB0aGlzLm9uZHJhaW4oeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2Nsb3NlJzpcbiAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NlZCdcbiAgICAgICAgdGhpcy5vbmNsb3NlICYmIHRoaXMub25jbG9zZSh7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIC8vXG4gIC8vIEFQSVxuICAvL1xuXG4gIGNsb3NlICgpIHtcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY2xvc2luZydcbiAgICB0aGlzLl9zb2NrZXQuZW5kKClcbiAgfVxuXG4gIHNlbmQgKGRhdGEpIHtcbiAgICAvLyBjb252ZXJ0IGRhdGEgdG8gc3RyaW5nIG9yIG5vZGUgYnVmZmVyXG4gICAgdGhpcy5fc29ja2V0LndyaXRlKGFycmF5QnVmZmVyVG9Ob2RlQnVmZmVyKGRhdGEpLCB0aGlzLl9lbWl0LmJpbmQodGhpcywgJ2RyYWluJykpXG4gIH1cblxuICB1cGdyYWRlVG9TZWN1cmUgKCkge1xuICAgIGlmICh0aGlzLnNzbCkgcmV0dXJuXG5cbiAgICB0aGlzLl9yZW1vdmVMaXN0ZW5lcnMoKVxuICAgIHRoaXMuX3NvY2tldCA9IHRscy5jb25uZWN0KHsgc29ja2V0OiB0aGlzLl9zb2NrZXQgfSwgKCkgPT4geyB0aGlzLnNzbCA9IHRydWUgfSlcbiAgICB0aGlzLl9hdHRhY2hMaXN0ZW5lcnMoKVxuICB9XG59XG5cbmNvbnN0IG5vZGVCdWZmZXJ0b0FycmF5QnVmZmVyID0gYnVmID0+IFVpbnQ4QXJyYXkuZnJvbShidWYpLmJ1ZmZlclxuY29uc3QgYXJyYXlCdWZmZXJUb05vZGVCdWZmZXIgPSAoYWIpID0+IEJ1ZmZlci5mcm9tKG5ldyBVaW50OEFycmF5KGFiKSlcbiJdfQ==