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

    var connectOptions = {
      port: this.port,
      host: this.host,
      servername: this.host // SNI
    };

    if (global.checkImapServerIdentity) {
      connectOptions.checkServerIdentity = global.checkImapServerIdentity;
    }

    this._socket = this.ssl ? _tls2.default.connect(connectOptions, function () {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9ub2RlLXNvY2tldC5qcyJdLCJuYW1lcyI6WyJUQ1BTb2NrZXQiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJzc2wiLCJidWZmZXJlZEFtb3VudCIsInJlYWR5U3RhdGUiLCJiaW5hcnlUeXBlIiwiRXJyb3IiLCJjb25uZWN0T3B0aW9ucyIsInNlcnZlcm5hbWUiLCJnbG9iYWwiLCJjaGVja0ltYXBTZXJ2ZXJJZGVudGl0eSIsImNoZWNrU2VydmVySWRlbnRpdHkiLCJfc29ja2V0IiwidGxzIiwiY29ubmVjdCIsIl9lbWl0IiwibmV0IiwiX2F0dGFjaExpc3RlbmVycyIsIm9uIiwibm9kZUJ1ZmZlcnRvQXJyYXlCdWZmZXIiLCJub2RlQnVmIiwiZXJyb3IiLCJjb2RlIiwiY2xvc2UiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJ0eXBlIiwiZGF0YSIsInRhcmdldCIsIm9ub3BlbiIsIm9uZXJyb3IiLCJvbmRhdGEiLCJvbmRyYWluIiwib25jbG9zZSIsImVuZCIsIndyaXRlIiwiYXJyYXlCdWZmZXJUb05vZGVCdWZmZXIiLCJiaW5kIiwiX3JlbW92ZUxpc3RlbmVycyIsInNvY2tldCIsIlVpbnQ4QXJyYXkiLCJmcm9tIiwiYnVmIiwiYnVmZmVyIiwiYWIiLCJCdWZmZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7SUFFcUJBLFM7Ozt5QkFDTkMsSSxFQUFNQyxJLEVBQW9CO0FBQUEsVUFBZEMsT0FBYyx1RUFBSixFQUFJOztBQUNyQyxhQUFPLElBQUlILFNBQUosQ0FBYyxFQUFFQyxVQUFGLEVBQVFDLFVBQVIsRUFBY0MsZ0JBQWQsRUFBZCxDQUFQO0FBQ0Q7OztBQUVELDJCQUFzQztBQUFBOztBQUFBLFFBQXZCRixJQUF1QixRQUF2QkEsSUFBdUI7QUFBQSxRQUFqQkMsSUFBaUIsUUFBakJBLElBQWlCO0FBQUEsUUFBWEMsT0FBVyxRQUFYQSxPQUFXOztBQUFBOztBQUNwQyxTQUFLRixJQUFMLEdBQVlB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dEIsVUFBTCxHQUFrQixRQUFsQjtBQUNBLGVBQUs0QixPQUFMLElBQWdCLEtBQUtBLE9BQUwsQ0FBYSxFQUFFTCxjQUFGLEVBQVVGLFVBQVYsRUFBZ0JDLFVBQWhCLEVBQWIsQ0FBaEI7QUFDQTtBQWpCSjtBQW1CRDs7QUFFRDtBQUNBO0FBQ0E7Ozs7NEJBRVM7QUFDUCxXQUFLdEIsVUFBTCxHQUFrQixTQUFsQjtBQUNBLFdBQUtRLE9BQUwsQ0FBYXFCLEdBQWI7QUFDRDs7O3lCQUVLUCxJLEVBQU07QUFDVjtBQUNBLFdBQUtkLE9BQUwsQ0FBYXNCLEtBQWIsQ0FBbUJDLHdCQUF3QlQsSUFBeEIsQ0FBbkIsRUFBa0QsS0FBS1gsS0FBTCxDQUFXcUIsSUFBWCxDQUFnQixJQUFoQixFQUFzQixPQUF0QixDQUFsRDtBQUNEOzs7c0NBRWtCO0FBQUE7O0FBQ2pCLFVBQUksS0FBS2xDLEdBQVQsRUFBYzs7QUFFZCxXQUFLbUMsZ0JBQUw7QUFDQSxXQUFLekIsT0FBTCxHQUFlQyxjQUFJQyxPQUFKLENBQVksRUFBRXdCLFFBQVEsS0FBSzFCLE9BQWYsRUFBWixFQUFzQyxZQUFNO0FBQUUsZUFBS1YsR0FBTCxHQUFXLElBQVg7QUFBaUIsT0FBL0QsQ0FBZjtBQUNBLFdBQUtlLGdCQUFMO0FBQ0Q7Ozs7OztrQkFqR2tCbkIsUzs7O0FBb0dyQixJQUFNcUIsMEJBQTBCLFNBQTFCQSx1QkFBMEI7QUFBQSxTQUFPb0IsV0FBV0MsSUFBWCxDQUFnQkMsR0FBaEIsRUFBcUJDLE1BQTVCO0FBQUEsQ0FBaEM7QUFDQSxJQUFNUCwwQkFBMEIsU0FBMUJBLHVCQUEwQixDQUFDUSxFQUFEO0FBQUEsU0FBUUMsT0FBT0osSUFBUCxDQUFZLElBQUlELFVBQUosQ0FBZUksRUFBZixDQUFaLENBQVI7QUFBQSxDQUFoQyIsImZpbGUiOiJub2RlLXNvY2tldC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHByb3BPciB9IGZyb20gJ3JhbWRhJ1xuaW1wb3J0IG5ldCBmcm9tICduZXQnXG5pbXBvcnQgdGxzIGZyb20gJ3RscydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVENQU29ja2V0IHtcbiAgc3RhdGljIG9wZW4gKGhvc3QsIHBvcnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiBuZXcgVENQU29ja2V0KHsgaG9zdCwgcG9ydCwgb3B0aW9ucyB9KVxuICB9XG5cbiAgY29uc3RydWN0b3IgKHsgaG9zdCwgcG9ydCwgb3B0aW9ucyB9KSB7XG4gICAgdGhpcy5ob3N0ID0gaG9zdFxuICAgIHRoaXMucG9ydCA9IHBvcnRcbiAgICB0aGlzLnNzbCA9IHByb3BPcihmYWxzZSwgJ3VzZVNlY3VyZVRyYW5zcG9ydCcpKG9wdGlvbnMpXG4gICAgdGhpcy5idWZmZXJlZEFtb3VudCA9IDBcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY29ubmVjdGluZydcbiAgICB0aGlzLmJpbmFyeVR5cGUgPSBwcm9wT3IoJ2FycmF5YnVmZmVyJywgJ2JpbmFyeVR5cGUnKShvcHRpb25zKVxuXG4gICAgaWYgKHRoaXMuYmluYXJ5VHlwZSAhPT0gJ2FycmF5YnVmZmVyJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IGFycmF5YnVmZmVycyBhcmUgc3VwcG9ydGVkIScpXG4gICAgfVxuXG4gICAgdmFyIGNvbm5lY3RPcHRpb25zID0ge1xuICAgICAgcG9ydDogdGhpcy5wb3J0LFxuICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgc2VydmVybmFtZTogdGhpcy5ob3N0IC8vIFNOSVxuICAgIH1cblxuICAgIGlmIChnbG9iYWwuY2hlY2tJbWFwU2VydmVySWRlbnRpdHkpIHtcbiAgICAgIGNvbm5lY3RPcHRpb25zLmNoZWNrU2VydmVySWRlbnRpdHkgPSBnbG9iYWwuY2hlY2tJbWFwU2VydmVySWRlbnRpdHlcbiAgICB9XG5cbiAgICB0aGlzLl9zb2NrZXQgPSB0aGlzLnNzbFxuICAgICAgPyB0bHMuY29ubmVjdChjb25uZWN0T3B0aW9ucywgKCkgPT4gdGhpcy5fZW1pdCgnb3BlbicpKVxuICAgICAgOiBuZXQuY29ubmVjdCh0aGlzLnBvcnQsIHRoaXMuaG9zdCwgKCkgPT4gdGhpcy5fZW1pdCgnb3BlbicpKVxuXG4gICAgLy8gYWRkIGFsbCBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIG5ldyBzb2NrZXRcbiAgICB0aGlzLl9hdHRhY2hMaXN0ZW5lcnMoKVxuICB9XG5cbiAgX2F0dGFjaExpc3RlbmVycyAoKSB7XG4gICAgdGhpcy5fc29ja2V0Lm9uKCdkYXRhJywgbm9kZUJ1ZiA9PiB0aGlzLl9lbWl0KCdkYXRhJywgbm9kZUJ1ZmZlcnRvQXJyYXlCdWZmZXIobm9kZUJ1ZikpKVxuICAgIHRoaXMuX3NvY2tldC5vbignZXJyb3InLCBlcnJvciA9PiB7XG4gICAgICAvLyBJZ25vcmUgRUNPTk5SRVNFVCBlcnJvcnMuIEZvciB0aGUgYXBwIHRoaXMgaXMgdGhlIHNhbWUgYXMgbm9ybWFsIGNsb3NlXG4gICAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ0VDT05OUkVTRVQnKSB7XG4gICAgICAgIHRoaXMuX2VtaXQoJ2Vycm9yJywgZXJyb3IpXG4gICAgICB9XG4gICAgICB0aGlzLmNsb3NlKClcbiAgICB9KVxuXG4gICAgdGhpcy5fc29ja2V0Lm9uKCdlbmQnLCAoKSA9PiB0aGlzLl9lbWl0KCdjbG9zZScpKVxuICB9XG5cbiAgX3JlbW92ZUxpc3RlbmVycyAoKSB7XG4gICAgdGhpcy5fc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnZGF0YScpXG4gICAgdGhpcy5fc29ja2V0LnJlbW92ZUFsbExpc3RlbmVycygnZW5kJylcbiAgICB0aGlzLl9zb2NrZXQucmVtb3ZlQWxsTGlzdGVuZXJzKCdlcnJvcicpXG4gIH1cblxuICBfZW1pdCAodHlwZSwgZGF0YSkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXNcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ29wZW4nOlxuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSAnb3BlbidcbiAgICAgICAgdGhpcy5vbm9wZW4gJiYgdGhpcy5vbm9wZW4oeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgdGhpcy5vbmVycm9yICYmIHRoaXMub25lcnJvcih7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZGF0YSc6XG4gICAgICAgIHRoaXMub25kYXRhICYmIHRoaXMub25kYXRhKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdkcmFpbic6XG4gICAgICAgIHRoaXMub25kcmFpbiAmJiB0aGlzLm9uZHJhaW4oeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2Nsb3NlJzpcbiAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NlZCdcbiAgICAgICAgdGhpcy5vbmNsb3NlICYmIHRoaXMub25jbG9zZSh7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIC8vXG4gIC8vIEFQSVxuICAvL1xuXG4gIGNsb3NlICgpIHtcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSAnY2xvc2luZydcbiAgICB0aGlzLl9zb2NrZXQuZW5kKClcbiAgfVxuXG4gIHNlbmQgKGRhdGEpIHtcbiAgICAvLyBjb252ZXJ0IGRhdGEgdG8gc3RyaW5nIG9yIG5vZGUgYnVmZmVyXG4gICAgdGhpcy5fc29ja2V0LndyaXRlKGFycmF5QnVmZmVyVG9Ob2RlQnVmZmVyKGRhdGEpLCB0aGlzLl9lbWl0LmJpbmQodGhpcywgJ2RyYWluJykpXG4gIH1cblxuICB1cGdyYWRlVG9TZWN1cmUgKCkge1xuICAgIGlmICh0aGlzLnNzbCkgcmV0dXJuXG5cbiAgICB0aGlzLl9yZW1vdmVMaXN0ZW5lcnMoKVxuICAgIHRoaXMuX3NvY2tldCA9IHRscy5jb25uZWN0KHsgc29ja2V0OiB0aGlzLl9zb2NrZXQgfSwgKCkgPT4geyB0aGlzLnNzbCA9IHRydWUgfSlcbiAgICB0aGlzLl9hdHRhY2hMaXN0ZW5lcnMoKVxuICB9XG59XG5cbmNvbnN0IG5vZGVCdWZmZXJ0b0FycmF5QnVmZmVyID0gYnVmID0+IFVpbnQ4QXJyYXkuZnJvbShidWYpLmJ1ZmZlclxuY29uc3QgYXJyYXlCdWZmZXJUb05vZGVCdWZmZXIgPSAoYWIpID0+IEJ1ZmZlci5mcm9tKG5ldyBVaW50OEFycmF5KGFiKSlcbiJdfQ==