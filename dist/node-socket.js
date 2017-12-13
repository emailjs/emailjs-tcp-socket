'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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

  function TCPSocket(config) {
    var _this = this;

    _classCallCheck(this, TCPSocket);

    config.options.useSecureTransport = typeof config.options.useSecureTransport !== 'undefined' ? config.options.useSecureTransport : false;
    config.options.binaryType = config.options.binaryType || 'arraybuffer';

    // public flags
    this.host = config.host;
    this.port = config.port;
    this.ssl = config.options.useSecureTransport;
    this.bufferedAmount = 0;
    this.readyState = 'connecting';
    this.binaryType = config.options.binaryType;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ub2RlLXNvY2tldC5qcyJdLCJuYW1lcyI6WyJUQ1BTb2NrZXQiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJjb25maWciLCJ1c2VTZWN1cmVUcmFuc3BvcnQiLCJiaW5hcnlUeXBlIiwic3NsIiwiYnVmZmVyZWRBbW91bnQiLCJyZWFkeVN0YXRlIiwiRXJyb3IiLCJfc29ja2V0IiwiY29ubmVjdCIsIl9lbWl0IiwiX2F0dGFjaExpc3RlbmVycyIsIm9uIiwibm9kZUJ1ZmZlcnRvQXJyYXlCdWZmZXIiLCJub2RlQnVmIiwiZXJyb3IiLCJjb2RlIiwiY2xvc2UiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJ0eXBlIiwiZGF0YSIsInRhcmdldCIsIm9ub3BlbiIsIm9uZXJyb3IiLCJvbmRhdGEiLCJvbmRyYWluIiwib25jbG9zZSIsImVuZCIsIndyaXRlIiwiYXJyYXlCdWZmZXJUb05vZGVCdWZmZXIiLCJiaW5kIiwiX3JlbW92ZUxpc3RlbmVycyIsInNvY2tldCIsIlVpbnQ4QXJyYXkiLCJmcm9tIiwiYnVmIiwiYnVmZmVyIiwiYWIiLCJCdWZmZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7Ozs7Ozs7SUFFcUJBLFM7Ozt5QkFDTkMsSSxFQUFNQyxJLEVBQW9CO0FBQUEsVUFBZEMsT0FBYyx1RUFBSixFQUFJOztBQUNyQyxhQUFPLElBQUlILFNBQUosQ0FBYyxFQUFFQyxVQUFGLEVBQVFDLFVBQVIsRUFBY0MsZ0JBQWQsRUFBZCxDQUFQO0FBQ0Q7OztBQUVELHFCQUFhQyxNQUFiLEVBQXFCO0FBQUE7O0FBQUE7O0FBQ25CQSxXQUFPRCxPQUFQLENBQWVFLGtCQUFmLEdBQXFDLE9BQU9ELE9BQU9ELE9BQVAsQ0FBZUUsa0JBQXRCLEtBQTZDLFdBQTlDLEdBQTZERCxPQUFPRCxPQUFQLENBQWVFLGtCQUE1RSxHQUFpRyxLQUFySTtBQUNBRCxXQUFPRCxPQUFQLENBQWVHLFVBQWYsR0FBNEJGLE9BQU9ELE9BQVAsQ0FBZUcsVUFBZixJQUE2QixhQUF6RDs7QUFFQTtBQUNBLFNBQUtMLElBQUwsR0FBWUcsT0FBT0gsSUFBbkI7QUFDQSxTQUFLQyxJQUFMLEdBQVlFLE9BQU9GLElBQW5CO0FBQ0EsU0FBS0ssR0FBTCxHQUFXSCxPQUFPRCxPQUFQLENBQWVFLGtCQUExQjtBQUNBLFNBQUtHLGNBQUwsR0FBc0IsQ0FBdEI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCLFlBQWxCO0FBQ0EsU0FBS0gsVUFBTCxHQUFrQkYsT0FBT0QsT0FBUCxDQUFlRyxVQUFqQzs7QUFFQSxRQUFJLEtBQUtBLFVBQUwsS0FBb0IsYUFBeEIsRUFBdUM7QUFDckMsWUFBTSxJQUFJSSxLQUFKLENBQVUsa0NBQVYsQ0FBTjtBQUNEOztBQUVELFNBQUtDLE9BQUwsR0FBZSxLQUFLSixHQUFMLEdBQ1gsY0FBSUssT0FBSixDQUFZLEtBQUtWLElBQWpCLEVBQXVCLEtBQUtELElBQTVCLEVBQWtDLEVBQWxDLEVBQXVDO0FBQUEsYUFBTSxNQUFLWSxLQUFMLENBQVcsTUFBWCxDQUFOO0FBQUEsS0FBdkMsQ0FEVyxHQUVYLGNBQUlELE9BQUosQ0FBWSxLQUFLVixJQUFqQixFQUF1QixLQUFLRCxJQUE1QixFQUFrQztBQUFBLGFBQU0sTUFBS1ksS0FBTCxDQUFXLE1BQVgsQ0FBTjtBQUFBLEtBQWxDLENBRko7O0FBSUE7QUFDQSxTQUFLQyxnQkFBTDtBQUNEOzs7O3VDQUVtQjtBQUFBOztBQUNsQixXQUFLSCxPQUFMLENBQWFJLEVBQWIsQ0FBZ0IsTUFBaEIsRUFBd0I7QUFBQSxlQUFXLE9BQUtGLEtBQUwsQ0FBVyxNQUFYLEVBQW1CRyx3QkFBd0JDLE9BQXhCLENBQW5CLENBQVg7QUFBQSxPQUF4QjtBQUNBLFdBQUtOLE9BQUwsQ0FBYUksRUFBYixDQUFnQixPQUFoQixFQUF5QixpQkFBUztBQUNoQztBQUNBLFlBQUlHLE1BQU1DLElBQU4sS0FBZSxZQUFuQixFQUFpQztBQUMvQixpQkFBS04sS0FBTCxDQUFXLE9BQVgsRUFBb0JLLEtBQXBCO0FBQ0Q7QUFDRCxlQUFLRSxLQUFMO0FBQ0QsT0FORDs7QUFRQSxXQUFLVCxPQUFMLENBQWFJLEVBQWIsQ0FBZ0IsS0FBaEIsRUFBdUI7QUFBQSxlQUFNLE9BQUtGLEtBQUwsQ0FBVyxPQUFYLENBQU47QUFBQSxPQUF2QjtBQUNEOzs7dUNBRW1CO0FBQ2xCLFdBQUtGLE9BQUwsQ0FBYVUsa0JBQWIsQ0FBZ0MsTUFBaEM7QUFDQSxXQUFLVixPQUFMLENBQWFVLGtCQUFiLENBQWdDLEtBQWhDO0FBQ0EsV0FBS1YsT0FBTCxDQUFhVSxrQkFBYixDQUFnQyxPQUFoQztBQUNEOzs7MEJBRU1DLEksRUFBTUMsSSxFQUFNO0FBQ2pCLFVBQU1DLFNBQVMsSUFBZjtBQUNBLGNBQVFGLElBQVI7QUFDRSxhQUFLLE1BQUw7QUFDRSxlQUFLYixVQUFMLEdBQWtCLE1BQWxCO0FBQ0EsZUFBS2dCLE1BQUwsSUFBZSxLQUFLQSxNQUFMLENBQVksRUFBRUQsY0FBRixFQUFVRixVQUFWLEVBQWdCQyxVQUFoQixFQUFaLENBQWY7QUFDQTtBQUNGLGFBQUssT0FBTDtBQUNFLGVBQUtHLE9BQUwsSUFBZ0IsS0FBS0EsT0FBTCxDQUFhLEVBQUVGLGNBQUYsRUFBVUYsVUFBVixFQUFnQkMsVUFBaEIsRUFBYixDQUFoQjtBQUNBO0FBQ0YsYUFBSyxNQUFMO0FBQ0UsZUFBS0ksTUFBTCxJQUFlLEtBQUtBLE1BQUwsQ0FBWSxFQUFFSCxjQUFGLEVBQVVGLFVBQVYsRUFBZ0JDLFVBQWhCLEVBQVosQ0FBZjtBQUNBO0FBQ0YsYUFBSyxPQUFMO0FBQ0UsZUFBS0ssT0FBTCxJQUFnQixLQUFLQSxPQUFMLENBQWEsRUFBRUosY0FBRixFQUFVRixVQUFWLEVBQWdCQyxVQUFoQixFQUFiLENBQWhCO0FBQ0E7QUFDRixhQUFLLE9BQUw7QUFDRSxlQUFLZCxVQUFMLEdBQWtCLFFBQWxCO0FBQ0EsZUFBS29CLE9BQUwsSUFBZ0IsS0FBS0EsT0FBTCxDQUFhLEVBQUVMLGNBQUYsRUFBVUYsVUFBVixFQUFnQkMsVUFBaEIsRUFBYixDQUFoQjtBQUNBO0FBakJKO0FBbUJEOztBQUVEO0FBQ0E7QUFDQTs7Ozs0QkFFUztBQUNQLFdBQUtkLFVBQUwsR0FBa0IsU0FBbEI7QUFDQSxXQUFLRSxPQUFMLENBQWFtQixHQUFiO0FBQ0Q7Ozt5QkFFS1AsSSxFQUFNO0FBQ1Y7QUFDQSxXQUFLWixPQUFMLENBQWFvQixLQUFiLENBQW1CQyx3QkFBd0JULElBQXhCLENBQW5CLEVBQWtELEtBQUtWLEtBQUwsQ0FBV29CLElBQVgsQ0FBZ0IsSUFBaEIsRUFBc0IsT0FBdEIsQ0FBbEQ7QUFDRDs7O3NDQUVrQjtBQUFBOztBQUNqQixVQUFJLEtBQUsxQixHQUFULEVBQWM7O0FBRWQsV0FBSzJCLGdCQUFMO0FBQ0EsV0FBS3ZCLE9BQUwsR0FBZSxjQUFJQyxPQUFKLENBQVksRUFBRXVCLFFBQVEsS0FBS3hCLE9BQWYsRUFBWixFQUFzQyxZQUFNO0FBQUUsZUFBS0osR0FBTCxHQUFXLElBQVg7QUFBaUIsT0FBL0QsQ0FBZjtBQUNBLFdBQUtPLGdCQUFMO0FBQ0Q7Ozs7OztrQkEzRmtCZCxTOzs7QUE4RnJCLElBQU1nQiwwQkFBMEIsU0FBMUJBLHVCQUEwQjtBQUFBLFNBQU9vQixXQUFXQyxJQUFYLENBQWdCQyxHQUFoQixFQUFxQkMsTUFBNUI7QUFBQSxDQUFoQztBQUNBLElBQU1QLDBCQUEwQixTQUExQkEsdUJBQTBCLENBQUNRLEVBQUQ7QUFBQSxTQUFRQyxPQUFPSixJQUFQLENBQVksSUFBSUQsVUFBSixDQUFlSSxFQUFmLENBQVosQ0FBUjtBQUFBLENBQWhDIiwiZmlsZSI6Im5vZGUtc29ja2V0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG5ldCBmcm9tICduZXQnXG5pbXBvcnQgdGxzIGZyb20gJ3RscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVENQU29ja2V0IHtcbiAgc3RhdGljIG9wZW4gKGhvc3QsIHBvcnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiBuZXcgVENQU29ja2V0KHsgaG9zdCwgcG9ydCwgb3B0aW9ucyB9KVxuICB9XG5cbiAgY29uc3RydWN0b3IgKGNvbmZpZykge1xuICAgIGNvbmZpZy5vcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydCA9ICh0eXBlb2YgY29uZmlnLm9wdGlvbnMudXNlU2VjdXJlVHJhbnNwb3J0ICE9PSAndW5kZWZpbmVkJykgPyBjb25maWcub3B0aW9ucy51c2VTZWN1cmVUcmFuc3BvcnQgOiBmYWxzZVxuICAgIGNvbmZpZy5vcHRpb25zLmJpbmFyeVR5cGUgPSBjb25maWcub3B0aW9ucy5iaW5hcnlUeXBlIHx8ICdhcnJheWJ1ZmZlcidcblxuICAgIC8vIHB1YmxpYyBmbGFnc1xuICAgIHRoaXMuaG9zdCA9IGNvbmZpZy5ob3N0XG4gICAgdGhpcy5wb3J0ID0gY29uZmlnLnBvcnRcbiAgICB0aGlzLnNzbCA9IGNvbmZpZy5vcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydFxuICAgIHRoaXMuYnVmZmVyZWRBbW91bnQgPSAwXG4gICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nvbm5lY3RpbmcnXG4gICAgdGhpcy5iaW5hcnlUeXBlID0gY29uZmlnLm9wdGlvbnMuYmluYXJ5VHlwZVxuXG4gICAgaWYgKHRoaXMuYmluYXJ5VHlwZSAhPT0gJ2FycmF5YnVmZmVyJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IGFycmF5YnVmZmVycyBhcmUgc3VwcG9ydGVkIScpXG4gICAgfVxuXG4gICAgdGhpcy5fc29ja2V0ID0gdGhpcy5zc2xcbiAgICAgID8gdGxzLmNvbm5lY3QodGhpcy5wb3J0LCB0aGlzLmhvc3QsIHsgfSwgKCkgPT4gdGhpcy5fZW1pdCgnb3BlbicpKVxuICAgICAgOiBuZXQuY29ubmVjdCh0aGlzLnBvcnQsIHRoaXMuaG9zdCwgKCkgPT4gdGhpcy5fZW1pdCgnb3BlbicpKVxuXG4gICAgLy8gYWRkIGFsbCBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIG5ldyBzb2NrZXRcbiAgICB0aGlzLl9hdHRhY2hMaXN0ZW5lcnMoKVxuICB9XG5cbiAgX2F0dGFjaExpc3RlbmVycyAoKSB7XG4gICAgdGhpcy5fc29ja2V0Lm9uKCdkYXRhJywgbm9kZUJ1ZiA9PiB0aGlzLl9lbWl0KCdkYXRhJywgbm9kZUJ1ZmZlcnRvQXJyYXlCdWZmZXIobm9kZUJ1ZikpKVxuICAgIHRoaXMuX3NvY2tldC5vbignZXJyb3InLCBlcnJvciA9PiB7XG4gICAgICAvLyBJZ25vcmUgRUNPTk5SRVNFVCBlcnJvcnMuIEZvciB0aGUgYXBwIHRoaXMgaXMgdGhlIHNhbWUgYXMgbm9ybWFsIGNsb3NlXG4gICAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ0VDT05OUkVTRVQnKSB7XG4gICAgICAgIHRoaXMuX2VtaXQoJ2Vycm9yJywgZXJyb3IpXG4gICAgICB9XG4gICAgICB0aGlzLmNsb3NlKClcbiAgICB9KVxuXG4gICAgdGhpcy5fc29ja2V0Lm9uKCdlbmQnLCAoKSA9PiB0aGlzLl9lbWl0KCdjbG9zZScpKVxuICB9XG5cbiAgX3JlbW92ZUxpc3RlbmVycyAoKSB7XG4gICAgdGhpcy5fc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnZGF0YScpXG4gICAgdGhpcy5fc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnZW5kJylcbiAgICB0aGlzLl9zb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKCdlcnJvcicpXG4gIH1cblxuICBfZW1pdCAodHlwZSwgZGF0YSkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXNcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ29wZW4nOlxuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSAnb3BlbidcbiAgICAgICAgdGhpcy5vbm9wZW4gJiYgdGhpcy5vbm9wZW4oeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgdGhpcy5vbmVycm9yICYmIHRoaXMub25lcnJvcih7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZGF0YSc6XG4gICAgICAgIHRoaXMub25kYXRhICYmIHRoaXMub25kYXRhKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdkcmFpbic6XG4gICAgICAgIHRoaXMub25kcmFpbiAmJiB0aGlzLm9uZHJhaW4oeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2Nsb3NlJzpcbiAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NlZCdcbiAgICAgICAgdGhpcy5vbmNsb3NlICYmIHRoaXMub25jbG9zZSh7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIC8vXG4gIC8vIEFQSVxuICAvL1xuXG4gIGNsb3NlICgpIHtcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY2xvc2luZydcbiAgICB0aGlzLl9zb2NrZXQuZW5kKClcbiAgfVxuXG4gIHNlbmQgKGRhdGEpIHtcbiAgICAvLyBjb252ZXJ0IGRhdGEgdG8gc3RyaW5nIG9yIG5vZGUgYnVmZmVyXG4gICAgdGhpcy5fc29ja2V0LndyaXRlKGFycmF5QnVmZmVyVG9Ob2RlQnVmZmVyKGRhdGEpLCB0aGlzLl9lbWl0LmJpbmQodGhpcywgJ2RyYWluJykpXG4gIH1cblxuICB1cGdyYWRlVG9TZWN1cmUgKCkge1xuICAgIGlmICh0aGlzLnNzbCkgcmV0dXJuXG5cbiAgICB0aGlzLl9yZW1vdmVMaXN0ZW5lcnMoKVxuICAgIHRoaXMuX3NvY2tldCA9IHRscy5jb25uZWN0KHsgc29ja2V0OiB0aGlzLl9zb2NrZXQgfSwgKCkgPT4geyB0aGlzLnNzbCA9IHRydWUgfSlcbiAgICB0aGlzLl9hdHRhY2hMaXN0ZW5lcnMoKVxuICB9XG59XG5cbmNvbnN0IG5vZGVCdWZmZXJ0b0FycmF5QnVmZmVyID0gYnVmID0+IFVpbnQ4QXJyYXkuZnJvbShidWYpLmJ1ZmZlclxuY29uc3QgYXJyYXlCdWZmZXJUb05vZGVCdWZmZXIgPSAoYWIpID0+IEJ1ZmZlci5mcm9tKG5ldyBVaW50OEFycmF5KGFiKSlcbiJdfQ==