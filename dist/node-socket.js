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

    var netApi = this.ssl ? _tls2.default : _net2.default;
    this._socket = netApi.connect(this.port, this.host, function () {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ub2RlLXNvY2tldC5qcyJdLCJuYW1lcyI6WyJUQ1BTb2NrZXQiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJjb25maWciLCJ1c2VTZWN1cmVUcmFuc3BvcnQiLCJiaW5hcnlUeXBlIiwic3NsIiwiYnVmZmVyZWRBbW91bnQiLCJyZWFkeVN0YXRlIiwiRXJyb3IiLCJuZXRBcGkiLCJfc29ja2V0IiwiY29ubmVjdCIsIl9lbWl0IiwiX2F0dGFjaExpc3RlbmVycyIsIm9uIiwibm9kZUJ1ZmZlcnRvQXJyYXlCdWZmZXIiLCJub2RlQnVmIiwiZXJyb3IiLCJjb2RlIiwiY2xvc2UiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJ0eXBlIiwiZGF0YSIsInRhcmdldCIsIm9ub3BlbiIsIm9uZXJyb3IiLCJvbmRhdGEiLCJvbmRyYWluIiwib25jbG9zZSIsImVuZCIsIndyaXRlIiwiYXJyYXlCdWZmZXJUb05vZGVCdWZmZXIiLCJiaW5kIiwiX3JlbW92ZUxpc3RlbmVycyIsInNvY2tldCIsIlVpbnQ4QXJyYXkiLCJmcm9tIiwiYnVmIiwiYnVmZmVyIiwiYWIiLCJCdWZmZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7Ozs7Ozs7SUFFcUJBLFM7Ozt5QkFDTkMsSSxFQUFNQyxJLEVBQW9CO0FBQUEsVUFBZEMsT0FBYyx1RUFBSixFQUFJOztBQUNyQyxhQUFPLElBQUlILFNBQUosQ0FBYyxFQUFFQyxVQUFGLEVBQVFDLFVBQVIsRUFBY0MsZ0JBQWQsRUFBZCxDQUFQO0FBQ0Q7OztBQUVELHFCQUFhQyxNQUFiLEVBQXFCO0FBQUE7O0FBQUE7O0FBQ25CQSxXQUFPRCxPQUFQLENBQWVFLGtCQUFmLEdBQXFDLE9BQU9ELE9BQU9ELE9BQVAsQ0FBZUUsa0JBQXRCLEtBQTZDLFdBQTlDLEdBQTZERCxPQUFPRCxPQUFQLENBQWVFLGtCQUE1RSxHQUFpRyxLQUFySTtBQUNBRCxXQUFPRCxPQUFQLENBQWVHLFVBQWYsR0FBNEJGLE9BQU9ELE9BQVAs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QU07QUFDVjtBQUNBLFdBQUtaLE9BQUwsQ0FBYW9CLEtBQWIsQ0FBbUJDLHdCQUF3QlQsSUFBeEIsQ0FBbkIsRUFBa0QsS0FBS1YsS0FBTCxDQUFXb0IsSUFBWCxDQUFnQixJQUFoQixFQUFzQixPQUF0QixDQUFsRDtBQUNEOzs7c0NBRWtCO0FBQUE7O0FBQ2pCLFVBQUksS0FBSzNCLEdBQVQsRUFBYzs7QUFFZCxXQUFLNEIsZ0JBQUw7QUFDQSxXQUFLdkIsT0FBTCxHQUFlLGNBQUlDLE9BQUosQ0FBWSxFQUFFdUIsUUFBUSxLQUFLeEIsT0FBZixFQUFaLEVBQXNDLFlBQU07QUFBRSxlQUFLTCxHQUFMLEdBQVcsSUFBWDtBQUFpQixPQUEvRCxDQUFmO0FBQ0EsV0FBS1EsZ0JBQUw7QUFDRDs7Ozs7O2tCQTFGa0JmLFM7OztBQTZGckIsSUFBTWlCLDBCQUEwQixTQUExQkEsdUJBQTBCO0FBQUEsU0FBT29CLFdBQVdDLElBQVgsQ0FBZ0JDLEdBQWhCLEVBQXFCQyxNQUE1QjtBQUFBLENBQWhDO0FBQ0EsSUFBTVAsMEJBQTBCLFNBQTFCQSx1QkFBMEIsQ0FBQ1EsRUFBRDtBQUFBLFNBQVFDLE9BQU9KLElBQVAsQ0FBWSxJQUFJRCxVQUFKLENBQWVJLEVBQWYsQ0FBWixDQUFSO0FBQUEsQ0FBaEMiLCJmaWxlIjoibm9kZS1zb2NrZXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbmV0IGZyb20gJ25ldCdcbmltcG9ydCB0bHMgZnJvbSAndGxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUQ1BTb2NrZXQge1xuICBzdGF0aWMgb3BlbiAoaG9zdCwgcG9ydCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIG5ldyBUQ1BTb2NrZXQoeyBob3N0LCBwb3J0LCBvcHRpb25zIH0pXG4gIH1cblxuICBjb25zdHJ1Y3RvciAoY29uZmlnKSB7XG4gICAgY29uZmlnLm9wdGlvbnMudXNlU2VjdXJlVHJhbnNwb3J0ID0gKHR5cGVvZiBjb25maWcub3B0aW9ucy51c2VTZWN1cmVUcmFuc3BvcnQgIT09ICd1bmRlZmluZWQnKSA/IGNvbmZpZy5vcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydCA6IGZhbHNlXG4gICAgY29uZmlnLm9wdGlvbnMuYmluYXJ5VHlwZSA9IGNvbmZpZy5vcHRpb25zLmJpbmFyeVR5cGUgfHwgJ2FycmF5YnVmZmVyJ1xuXG4gICAgLy8gcHVibGljIGZsYWdzXG4gICAgdGhpcy5ob3N0ID0gY29uZmlnLmhvc3RcbiAgICB0aGlzLnBvcnQgPSBjb25maWcucG9ydFxuICAgIHRoaXMuc3NsID0gY29uZmlnLm9wdGlvbnMudXNlU2VjdXJlVHJhbnNwb3J0XG4gICAgdGhpcy5idWZmZXJlZEFtb3VudCA9IDBcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY29ubmVjdGluZydcbiAgICB0aGlzLmJpbmFyeVR5cGUgPSBjb25maWcub3B0aW9ucy5iaW5hcnlUeXBlXG5cbiAgICBpZiAodGhpcy5iaW5hcnlUeXBlICE9PSAnYXJyYXlidWZmZXInKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgYXJyYXlidWZmZXJzIGFyZSBzdXBwb3J0ZWQhJylcbiAgICB9XG5cbiAgICBjb25zdCBuZXRBcGkgPSB0aGlzLnNzbCA/IHRscyA6IG5ldFxuICAgIHRoaXMuX3NvY2tldCA9IG5ldEFwaS5jb25uZWN0KHRoaXMucG9ydCwgdGhpcy5ob3N0LCAoKSA9PiB0aGlzLl9lbWl0KCdvcGVuJykpXG5cbiAgICAvLyBhZGQgYWxsIGV2ZW50IGxpc3RlbmVycyB0byB0aGUgbmV3IHNvY2tldFxuICAgIHRoaXMuX2F0dGFjaExpc3RlbmVycygpXG4gIH1cblxuICBfYXR0YWNoTGlzdGVuZXJzICgpIHtcbiAgICB0aGlzLl9zb2NrZXQub24oJ2RhdGEnLCBub2RlQnVmID0+IHRoaXMuX2VtaXQoJ2RhdGEnLCBub2RlQnVmZmVydG9BcnJheUJ1ZmZlcihub2RlQnVmKSkpXG4gICAgdGhpcy5fc29ja2V0Lm9uKCdlcnJvcicsIGVycm9yID0+IHtcbiAgICAgIC8vIElnbm9yZSBFQ09OTlJFU0VUIGVycm9ycy4gRm9yIHRoZSBhcHAgdGhpcyBpcyB0aGUgc2FtZSBhcyBub3JtYWwgY2xvc2VcbiAgICAgIGlmIChlcnJvci5jb2RlICE9PSAnRUNPTk5SRVNFVCcpIHtcbiAgICAgICAgdGhpcy5fZW1pdCgnZXJyb3InLCBlcnJvcilcbiAgICAgIH1cbiAgICAgIHRoaXMuY2xvc2UoKVxuICAgIH0pXG5cbiAgICB0aGlzLl9zb2NrZXQub24oJ2VuZCcsICgpID0+IHRoaXMuX2VtaXQoJ2Nsb3NlJykpXG4gIH1cblxuICBfcmVtb3ZlTGlzdGVuZXJzICgpIHtcbiAgICB0aGlzLl9zb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKCdkYXRhJylcbiAgICB0aGlzLl9zb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKCdlbmQnKVxuICAgIHRoaXMuX3NvY2tldC5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2Vycm9yJylcbiAgfVxuXG4gIF9lbWl0ICh0eXBlLCBkYXRhKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpc1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnb3Blbic6XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9ICdvcGVuJ1xuICAgICAgICB0aGlzLm9ub3BlbiAmJiB0aGlzLm9ub3Blbih7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICB0aGlzLm9uZXJyb3IgJiYgdGhpcy5vbmVycm9yKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdkYXRhJzpcbiAgICAgICAgdGhpcy5vbmRhdGEgJiYgdGhpcy5vbmRhdGEoeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2RyYWluJzpcbiAgICAgICAgdGhpcy5vbmRyYWluICYmIHRoaXMub25kcmFpbih7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnY2xvc2UnOlxuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY2xvc2VkJ1xuICAgICAgICB0aGlzLm9uY2xvc2UgJiYgdGhpcy5vbmNsb3NlKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgLy9cbiAgLy8gQVBJXG4gIC8vXG5cbiAgY2xvc2UgKCkge1xuICAgIHRoaXMucmVhZHlTdGF0ZSA9ICdjbG9zaW5nJ1xuICAgIHRoaXMuX3NvY2tldC5lbmQoKVxuICB9XG5cbiAgc2VuZCAoZGF0YSkge1xuICAgIC8vIGNvbnZlcnQgZGF0YSB0byBzdHJpbmcgb3Igbm9kZSBidWZmZXJcbiAgICB0aGlzLl9zb2NrZXQud3JpdGUoYXJyYXlCdWZmZXJUb05vZGVCdWZmZXIoZGF0YSksIHRoaXMuX2VtaXQuYmluZCh0aGlzLCAnZHJhaW4nKSlcbiAgfVxuXG4gIHVwZ3JhZGVUb1NlY3VyZSAoKSB7XG4gICAgaWYgKHRoaXMuc3NsKSByZXR1cm5cblxuICAgIHRoaXMuX3JlbW92ZUxpc3RlbmVycygpXG4gICAgdGhpcy5fc29ja2V0ID0gdGxzLmNvbm5lY3QoeyBzb2NrZXQ6IHRoaXMuX3NvY2tldCB9LCAoKSA9PiB7IHRoaXMuc3NsID0gdHJ1ZSB9KVxuICAgIHRoaXMuX2F0dGFjaExpc3RlbmVycygpXG4gIH1cbn1cblxuY29uc3Qgbm9kZUJ1ZmZlcnRvQXJyYXlCdWZmZXIgPSBidWYgPT4gVWludDhBcnJheS5mcm9tKGJ1ZikuYnVmZmVyXG5jb25zdCBhcnJheUJ1ZmZlclRvTm9kZUJ1ZmZlciA9IChhYikgPT4gQnVmZmVyLmZyb20obmV3IFVpbnQ4QXJyYXkoYWIpKVxuIl19