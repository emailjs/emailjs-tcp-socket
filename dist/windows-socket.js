'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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
    this.host = new Windows.Networking.HostName(config.host); // NB! HostName constructor will throw on invalid input
    this.port = config.port;
    this.ssl = config.options.useSecureTransport;
    this.bufferedAmount = 0;
    this.readyState = 'connecting';
    this.binaryType = config.options.binaryType;

    if (this.binaryType !== 'arraybuffer') {
      throw new Error('Only arraybuffers are supported!');
    }

    this._socket = new Windows.Networking.Sockets.StreamSocket();

    this._socket.control.keepAlive = true;
    this._socket.control.noDelay = true;

    this._dataReader = null;
    this._dataWriter = null;

    // set to true if upgrading with STARTTLS
    this._upgrading = false;

    // cache all client.send calls to this array if currently upgrading
    this._upgradeCache = [];

    // initial socket type. default is 'plainSocket' (no encryption applied)
    // 'tls12' supports the TLS 1.2, TLS 1.1 and TLS 1.0 protocols but no SSL
    this._protectionLevel = Windows.Networking.Sockets.SocketProtectionLevel[this.ssl ? 'tls12' : 'plainSocket'];

    // Initiate connection to destination
    this._socket.connectAsync(this.host, this.port, this._protectionLevel).done(function () {
      _this._setStreamHandlers();
      _this._emit('open');
    }, function (e) {
      return _this._emit('error', e);
    });
  }

  /**
   * Initiate Reader and Writer interfaces for the socket
   */


  _createClass(TCPSocket, [{
    key: '_setStreamHandlers',
    value: function _setStreamHandlers() {
      this._dataReader = new Windows.Storage.Streams.DataReader(this._socket.inputStream);
      this._dataReader.inputStreamOptions = Windows.Storage.Streams.InputStreamOptions.partial;

      // setup writer
      this._dataWriter = new Windows.Storage.Streams.DataWriter(this._socket.outputStream);

      // start byte reader loop
      this._read();
    }

    /**
     * Emit an error and close socket
     *
     * @param {Error} error Error object
     */

  }, {
    key: '_errorHandler',
    value: function _errorHandler(error) {
      // we ignore errors after close has been called, since all aborted operations
      // will emit their error handlers
      // this will also apply to starttls as a read call is aborted before upgrading the socket
      if (this._upgrading || this.readyState !== 'closing' && this.readyState !== 'closed') {
        this._emit('error', error);
        this.close();
      }
    }

    /**
     * Read available bytes from the socket. This method is recursive  once it ends, it restarts itthis
     */

  }, {
    key: '_read',
    value: function _read() {
      var _this2 = this;

      if (this._upgrading || this.readyState !== 'open' && this.readyState !== 'connecting') {
        return; // do nothing if socket not open
      }

      // Read up to 4096 bytes from the socket. This is not a fixed number (the mode was set
      // with inputStreamOptions.partial property), so it might return with a smaller
      // amount of bytes.
      this._dataReader.loadAsync(4096).done(function (availableByteCount) {
        if (!availableByteCount) {
          // no bytes available for reading, restart the reading process
          return setImmediate(_this2._read.bind(_this2));
        }

        // we need an Uint8Array that gets filled with the bytes from the buffer
        var data = new Uint8Array(availableByteCount);
        _this2._dataReader.readBytes(data); // data argument gets filled with the bytes

        _this2._emit('data', data.buffer);

        // restart reading process
        return setImmediate(_this2._read.bind(_this2));
      }, function (e) {
        return _this2._errorHandler(e);
      });
    }

    //
    // API
    //

  }, {
    key: 'close',
    value: function close() {
      this.readyState = 'closing';

      try {
        this._socket.close();
      } catch (E) {
        this._emit('error', E);
      }

      setImmediate(this._emit.bind(this, 'close'));
    }
  }, {
    key: 'send',
    value: function send(data) {
      var _this3 = this;

      if (this.readyState !== 'open') {
        return;
      }

      if (this._upgrading) {
        this._upgradeCache.push(data);
        return;
      }

      // Write bytes to buffer
      this._dataWriter.writeBytes(data);

      // Emit buffer contents
      this._dataWriter.storeAsync().done(function () {
        return _this3._emit('drain');
      }, function (e) {
        return _this3._errorHandler(e);
      });
    }
  }, {
    key: 'upgradeToSecure',
    value: function upgradeToSecure() {
      var _this4 = this;

      if (this.ssl || this._upgrading) return;

      this._upgrading = true;
      try {
        // release current input stream. this is required to allow socket upgrade
        // write stream is not released as all send calls are cached from this point onwards
        // and not passed to socket until the socket is upgraded
        this._dataReader.detachStream();
      } catch (E) {}

      // update protection level
      this._protectionLevel = Windows.Networking.Sockets.SocketProtectionLevel.tls12;

      this._socket.upgradeToSslAsync(this._protectionLevel, this.host).done(function () {
        _this4._upgrading = false;
        _this4.ssl = true; // secured connection from now on

        _this4._dataReader = new Windows.Storage.Streams.DataReader(_this4._socket.inputStream);
        _this4._dataReader.inputStreamOptions = Windows.Storage.Streams.InputStreamOptions.partial;
        _this4._read();

        // emit all cached requests
        while (_this4._upgradeCache.length) {
          var data = _this4._upgradeCache.shift();
          _this4.send(data);
        }
      }, function (e) {
        _this4._upgrading = false;
        _this4._errorHandler(e);
      });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy93aW5kb3dzLXNvY2tldC5qcyJdLCJuYW1lcyI6WyJUQ1BTb2NrZXQiLCJob3N0IiwicG9ydCIsIm9wdGlvbnMiLCJjb25maWciLCJ1c2VTZWN1cmVUcmFuc3BvcnQiLCJiaW5hcnlUeXBlIiwiV2luZG93cyIsIk5ldHdvcmtpbmciLCJIb3N0TmFtZSIsInNzbCIsImJ1ZmZlcmVkQW1vdW50IiwicmVhZHlTdGF0ZSIsIkVycm9yIiwiX3NvY2tldCIsIlNvY2tldHMiLCJTdHJlYW1Tb2NrZXQiLCJjb250cm9sIiwia2VlcEFsaXZlIiwibm9EZWxheSIsIl9kYXRhUmVhZGVyIiwiX2RhdGFXcml0ZXIiLCJfdXBncmFkaW5nIiwiX3VwZ3JhZGVDYWNoZSIsIl9wcm90ZWN0aW9uTGV2ZWwiLCJTb2NrZXRQcm90ZWN0aW9uTGV2ZWwiLCJjb25uZWN0QXN5bmMiLCJkb25lIiwiX3NldFN0cmVhbUhhbmRsZXJzIiwiX2VtaXQiLCJlIiwiU3RvcmFnZSIsIlN0cmVhbXMiLCJEYXRhUmVhZGVyIiwiaW5wdXRTdHJlYW0iLCJpbnB1dFN0cmVhbU9wdGlvbnMiLCJJbnB1dFN0cmVhbU9wdGlvbnMiLCJwYXJ0aWFsIiwiRGF0YVdyaXRlciIsIm91dHB1dFN0cmVhbSIsIl9yZWFkIiwiZXJyb3IiLCJjbG9zZSIsImxvYWRBc3luYyIsImF2YWlsYWJsZUJ5dGVDb3VudCIsInNldEltbWVkaWF0ZSIsImJpbmQiLCJkYXRhIiwiVWludDhBcnJheSIsInJlYWRCeXRlcyIsImJ1ZmZlciIsIl9lcnJvckhhbmRsZXIiLCJFIiwicHVzaCIsIndyaXRlQnl0ZXMiLCJzdG9yZUFzeW5jIiwiZGV0YWNoU3RyZWFtIiwidGxzMTIiLCJ1cGdyYWRlVG9Tc2xBc3luYyIsImxlbmd0aCIsInNoaWZ0Iiwic2VuZCIsInR5cGUiLCJ0YXJnZXQiLCJvbm9wZW4iLCJvbmVycm9yIiwib25kYXRhIiwib25kcmFpbiIsIm9uY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7SUFBcUJB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QjtBQUNBO0FBQ0YsYUFBSyxPQUFMO0FBQ0UsZUFBS25DLFVBQUwsR0FBa0IsUUFBbEI7QUFDQSxlQUFLd0QsT0FBTCxJQUFnQixLQUFLQSxPQUFMLENBQWEsRUFBRUwsY0FBRixFQUFVRCxVQUFWLEVBQWdCZixVQUFoQixFQUFiLENBQWhCO0FBQ0E7QUFqQko7QUFtQkQ7Ozs7OztrQkFuTWtCL0MsUyIsImZpbGUiOiJ3aW5kb3dzLXNvY2tldC5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBkZWZhdWx0IGNsYXNzIFRDUFNvY2tldCB7XG4gIHN0YXRpYyBvcGVuIChob3N0LCBwb3J0LCBvcHRpb25zID0ge30pIHtcbiAgICByZXR1cm4gbmV3IFRDUFNvY2tldCh7IGhvc3QsIHBvcnQsIG9wdGlvbnMgfSlcbiAgfVxuXG4gIGNvbnN0cnVjdG9yIChjb25maWcpIHtcbiAgICBjb25maWcub3B0aW9ucy51c2VTZWN1cmVUcmFuc3BvcnQgPSAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydCAhPT0gJ3VuZGVmaW5lZCcpID8gY29uZmlnLm9wdGlvbnMudXNlU2VjdXJlVHJhbnNwb3J0IDogZmFsc2VcbiAgICBjb25maWcub3B0aW9ucy5iaW5hcnlUeXBlID0gY29uZmlnLm9wdGlvbnMuYmluYXJ5VHlwZSB8fCAnYXJyYXlidWZmZXInXG5cbiAgICAvLyBwdWJsaWMgZmxhZ3NcbiAgICB0aGlzLmhvc3QgPSBuZXcgV2luZG93cy5OZXR3b3JraW5nLkhvc3ROYW1lKGNvbmZpZy5ob3N0KSAvLyBOQiEgSG9zdE5hbWUgY29uc3RydWN0b3Igd2lsbCB0aHJvdyBvbiBpbnZhbGlkIGlucHV0XG4gICAgdGhpcy5wb3J0ID0gY29uZmlnLnBvcnRcbiAgICB0aGlzLnNzbCA9IGNvbmZpZy5vcHRpb25zLnVzZVNlY3VyZVRyYW5zcG9ydFxuICAgIHRoaXMuYnVmZmVyZWRBbW91bnQgPSAwXG4gICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nvbm5lY3RpbmcnXG4gICAgdGhpcy5iaW5hcnlUeXBlID0gY29uZmlnLm9wdGlvbnMuYmluYXJ5VHlwZVxuXG4gICAgaWYgKHRoaXMuYmluYXJ5VHlwZSAhPT0gJ2FycmF5YnVmZmVyJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IGFycmF5YnVmZmVycyBhcmUgc3VwcG9ydGVkIScpXG4gICAgfVxuXG4gICAgdGhpcy5fc29ja2V0ID0gbmV3IFdpbmRvd3MuTmV0d29ya2luZy5Tb2NrZXRzLlN0cmVhbVNvY2tldCgpXG5cbiAgICB0aGlzLl9zb2NrZXQuY29udHJvbC5rZWVwQWxpdmUgPSB0cnVlXG4gICAgdGhpcy5fc29ja2V0LmNvbnRyb2wubm9EZWxheSA9IHRydWVcblxuICAgIHRoaXMuX2RhdGFSZWFkZXIgPSBudWxsXG4gICAgdGhpcy5fZGF0YVdyaXRlciA9IG51bGxcblxuICAgIC8vIHNldCB0byB0cnVlIGlmIHVwZ3JhZGluZyB3aXRoIFNUQVJUVExTXG4gICAgdGhpcy5fdXBncmFkaW5nID0gZmFsc2VcblxuICAgIC8vIGNhY2hlIGFsbCBjbGllbnQuc2VuZCBjYWxscyB0byB0aGlzIGFycmF5IGlmIGN1cnJlbnRseSB1cGdyYWRpbmdcbiAgICB0aGlzLl91cGdyYWRlQ2FjaGUgPSBbXVxuXG4gICAgLy8gaW5pdGlhbCBzb2NrZXQgdHlwZS4gZGVmYXVsdCBpcyAncGxhaW5Tb2NrZXQnIChubyBlbmNyeXB0aW9uIGFwcGxpZWQpXG4gICAgLy8gJ3RsczEyJyBzdXBwb3J0cyB0aGUgVExTIDEuMiwgVExTIDEuMSBhbmQgVExTIDEuMCBwcm90b2NvbHMgYnV0IG5vIFNTTFxuICAgIHRoaXMuX3Byb3RlY3Rpb25MZXZlbCA9IFdpbmRvd3MuTmV0d29ya2luZy5Tb2NrZXRzLlNvY2tldFByb3RlY3Rpb25MZXZlbFt0aGlzLnNzbCA/ICd0bHMxMicgOiAncGxhaW5Tb2NrZXQnXVxuXG4gICAgLy8gSW5pdGlhdGUgY29ubmVjdGlvbiB0byBkZXN0aW5hdGlvblxuICAgIHRoaXMuX3NvY2tldFxuICAgICAgLmNvbm5lY3RBc3luYyh0aGlzLmhvc3QsIHRoaXMucG9ydCwgdGhpcy5fcHJvdGVjdGlvbkxldmVsKVxuICAgICAgLmRvbmUoKCkgPT4ge1xuICAgICAgICB0aGlzLl9zZXRTdHJlYW1IYW5kbGVycygpXG4gICAgICAgIHRoaXMuX2VtaXQoJ29wZW4nKVxuICAgICAgfSwgZSA9PiB0aGlzLl9lbWl0KCdlcnJvcicsIGUpKVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYXRlIFJlYWRlciBhbmQgV3JpdGVyIGludGVyZmFjZXMgZm9yIHRoZSBzb2NrZXRcbiAgICovXG4gIF9zZXRTdHJlYW1IYW5kbGVycyAoKSB7XG4gICAgdGhpcy5fZGF0YVJlYWRlciA9IG5ldyBXaW5kb3dzLlN0b3JhZ2UuU3RyZWFtcy5EYXRhUmVhZGVyKHRoaXMuX3NvY2tldC5pbnB1dFN0cmVhbSlcbiAgICB0aGlzLl9kYXRhUmVhZGVyLmlucHV0U3RyZWFtT3B0aW9ucyA9IFdpbmRvd3MuU3RvcmFnZS5TdHJlYW1zLklucHV0U3RyZWFtT3B0aW9ucy5wYXJ0aWFsXG5cbiAgICAvLyBzZXR1cCB3cml0ZXJcbiAgICB0aGlzLl9kYXRhV3JpdGVyID0gbmV3IFdpbmRvd3MuU3RvcmFnZS5TdHJlYW1zLkRhdGFXcml0ZXIodGhpcy5fc29ja2V0Lm91dHB1dFN0cmVhbSlcblxuICAgIC8vIHN0YXJ0IGJ5dGUgcmVhZGVyIGxvb3BcbiAgICB0aGlzLl9yZWFkKClcbiAgfVxuXG4gIC8qKlxuICAgKiBFbWl0IGFuIGVycm9yIGFuZCBjbG9zZSBzb2NrZXRcbiAgICpcbiAgICogQHBhcmFtIHtFcnJvcn0gZXJyb3IgRXJyb3Igb2JqZWN0XG4gICAqL1xuICBfZXJyb3JIYW5kbGVyIChlcnJvcikge1xuICAgIC8vIHdlIGlnbm9yZSBlcnJvcnMgYWZ0ZXIgY2xvc2UgaGFzIGJlZW4gY2FsbGVkLCBzaW5jZSBhbGwgYWJvcnRlZCBvcGVyYXRpb25zXG4gICAgLy8gd2lsbCBlbWl0IHRoZWlyIGVycm9yIGhhbmRsZXJzXG4gICAgLy8gdGhpcyB3aWxsIGFsc28gYXBwbHkgdG8gc3RhcnR0bHMgYXMgYSByZWFkIGNhbGwgaXMgYWJvcnRlZCBiZWZvcmUgdXBncmFkaW5nIHRoZSBzb2NrZXRcbiAgICBpZiAodGhpcy5fdXBncmFkaW5nIHx8ICh0aGlzLnJlYWR5U3RhdGUgIT09ICdjbG9zaW5nJyAmJiB0aGlzLnJlYWR5U3RhdGUgIT09ICdjbG9zZWQnKSkge1xuICAgICAgdGhpcy5fZW1pdCgnZXJyb3InLCBlcnJvcilcbiAgICAgIHRoaXMuY2xvc2UoKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIGF2YWlsYWJsZSBieXRlcyBmcm9tIHRoZSBzb2NrZXQuIFRoaXMgbWV0aG9kIGlzIHJlY3Vyc2l2ZSAgb25jZSBpdCBlbmRzLCBpdCByZXN0YXJ0cyBpdHRoaXNcbiAgICovXG4gIF9yZWFkICgpIHtcbiAgICBpZiAodGhpcy5fdXBncmFkaW5nIHx8ICh0aGlzLnJlYWR5U3RhdGUgIT09ICdvcGVuJyAmJiB0aGlzLnJlYWR5U3RhdGUgIT09ICdjb25uZWN0aW5nJykpIHtcbiAgICAgIHJldHVybiAvLyBkbyBub3RoaW5nIGlmIHNvY2tldCBub3Qgb3BlblxuICAgIH1cblxuICAgIC8vIFJlYWQgdXAgdG8gNDA5NiBieXRlcyBmcm9tIHRoZSBzb2NrZXQuIFRoaXMgaXMgbm90IGEgZml4ZWQgbnVtYmVyICh0aGUgbW9kZSB3YXMgc2V0XG4gICAgLy8gd2l0aCBpbnB1dFN0cmVhbU9wdGlvbnMucGFydGlhbCBwcm9wZXJ0eSksIHNvIGl0IG1pZ2h0IHJldHVybiB3aXRoIGEgc21hbGxlclxuICAgIC8vIGFtb3VudCBvZiBieXRlcy5cbiAgICB0aGlzLl9kYXRhUmVhZGVyLmxvYWRBc3luYyg0MDk2KS5kb25lKGF2YWlsYWJsZUJ5dGVDb3VudCA9PiB7XG4gICAgICBpZiAoIWF2YWlsYWJsZUJ5dGVDb3VudCkge1xuICAgICAgICAvLyBubyBieXRlcyBhdmFpbGFibGUgZm9yIHJlYWRpbmcsIHJlc3RhcnQgdGhlIHJlYWRpbmcgcHJvY2Vzc1xuICAgICAgICByZXR1cm4gc2V0SW1tZWRpYXRlKHRoaXMuX3JlYWQuYmluZCh0aGlzKSlcbiAgICAgIH1cblxuICAgICAgLy8gd2UgbmVlZCBhbiBVaW50OEFycmF5IHRoYXQgZ2V0cyBmaWxsZWQgd2l0aCB0aGUgYnl0ZXMgZnJvbSB0aGUgYnVmZmVyXG4gICAgICB2YXIgZGF0YSA9IG5ldyBVaW50OEFycmF5KGF2YWlsYWJsZUJ5dGVDb3VudClcbiAgICAgIHRoaXMuX2RhdGFSZWFkZXIucmVhZEJ5dGVzKGRhdGEpIC8vIGRhdGEgYXJndW1lbnQgZ2V0cyBmaWxsZWQgd2l0aCB0aGUgYnl0ZXNcblxuICAgICAgdGhpcy5fZW1pdCgnZGF0YScsIGRhdGEuYnVmZmVyKVxuXG4gICAgICAvLyByZXN0YXJ0IHJlYWRpbmcgcHJvY2Vzc1xuICAgICAgcmV0dXJuIHNldEltbWVkaWF0ZSh0aGlzLl9yZWFkLmJpbmQodGhpcykpXG4gICAgfSwgZSA9PiB0aGlzLl9lcnJvckhhbmRsZXIoZSkpXG4gIH1cblxuICAvL1xuICAvLyBBUElcbiAgLy9cblxuICBjbG9zZSAoKSB7XG4gICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NpbmcnXG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5fc29ja2V0LmNsb3NlKClcbiAgICB9IGNhdGNoIChFKSB7XG4gICAgICB0aGlzLl9lbWl0KCdlcnJvcicsIEUpXG4gICAgfVxuXG4gICAgc2V0SW1tZWRpYXRlKHRoaXMuX2VtaXQuYmluZCh0aGlzLCAnY2xvc2UnKSlcbiAgfVxuXG4gIHNlbmQgKGRhdGEpIHtcbiAgICBpZiAodGhpcy5yZWFkeVN0YXRlICE9PSAnb3BlbicpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICh0aGlzLl91cGdyYWRpbmcpIHtcbiAgICAgIHRoaXMuX3VwZ3JhZGVDYWNoZS5wdXNoKGRhdGEpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBXcml0ZSBieXRlcyB0byBidWZmZXJcbiAgICB0aGlzLl9kYXRhV3JpdGVyLndyaXRlQnl0ZXMoZGF0YSlcblxuICAgIC8vIEVtaXQgYnVmZmVyIGNvbnRlbnRzXG4gICAgdGhpcy5fZGF0YVdyaXRlci5zdG9yZUFzeW5jKCkuZG9uZSgoKSA9PiB0aGlzLl9lbWl0KCdkcmFpbicpLCAoZSkgPT4gdGhpcy5fZXJyb3JIYW5kbGVyKGUpKVxuICB9XG5cbiAgdXBncmFkZVRvU2VjdXJlICgpIHtcbiAgICBpZiAodGhpcy5zc2wgfHwgdGhpcy5fdXBncmFkaW5nKSByZXR1cm5cblxuICAgIHRoaXMuX3VwZ3JhZGluZyA9IHRydWVcbiAgICB0cnkge1xuICAgICAgLy8gcmVsZWFzZSBjdXJyZW50IGlucHV0IHN0cmVhbS4gdGhpcyBpcyByZXF1aXJlZCB0byBhbGxvdyBzb2NrZXQgdXBncmFkZVxuICAgICAgLy8gd3JpdGUgc3RyZWFtIGlzIG5vdCByZWxlYXNlZCBhcyBhbGwgc2VuZCBjYWxscyBhcmUgY2FjaGVkIGZyb20gdGhpcyBwb2ludCBvbndhcmRzXG4gICAgICAvLyBhbmQgbm90IHBhc3NlZCB0byBzb2NrZXQgdW50aWwgdGhlIHNvY2tldCBpcyB1cGdyYWRlZFxuICAgICAgdGhpcy5fZGF0YVJlYWRlci5kZXRhY2hTdHJlYW0oKVxuICAgIH0gY2F0Y2ggKEUpIHsgfVxuXG4gICAgLy8gdXBkYXRlIHByb3RlY3Rpb24gbGV2ZWxcbiAgICB0aGlzLl9wcm90ZWN0aW9uTGV2ZWwgPSBXaW5kb3dzLk5ldHdvcmtpbmcuU29ja2V0cy5Tb2NrZXRQcm90ZWN0aW9uTGV2ZWwudGxzMTJcblxuICAgIHRoaXMuX3NvY2tldC51cGdyYWRlVG9Tc2xBc3luYyh0aGlzLl9wcm90ZWN0aW9uTGV2ZWwsIHRoaXMuaG9zdCkuZG9uZShcbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy5fdXBncmFkaW5nID0gZmFsc2VcbiAgICAgICAgdGhpcy5zc2wgPSB0cnVlIC8vIHNlY3VyZWQgY29ubmVjdGlvbiBmcm9tIG5vdyBvblxuXG4gICAgICAgIHRoaXMuX2RhdGFSZWFkZXIgPSBuZXcgV2luZG93cy5TdG9yYWdlLlN0cmVhbXMuRGF0YVJlYWRlcih0aGlzLl9zb2NrZXQuaW5wdXRTdHJlYW0pXG4gICAgICAgIHRoaXMuX2RhdGFSZWFkZXIuaW5wdXRTdHJlYW1PcHRpb25zID0gV2luZG93cy5TdG9yYWdlLlN0cmVhbXMuSW5wdXRTdHJlYW1PcHRpb25zLnBhcnRpYWxcbiAgICAgICAgdGhpcy5fcmVhZCgpXG5cbiAgICAgICAgLy8gZW1pdCBhbGwgY2FjaGVkIHJlcXVlc3RzXG4gICAgICAgIHdoaWxlICh0aGlzLl91cGdyYWRlQ2FjaGUubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuX3VwZ3JhZGVDYWNoZS5zaGlmdCgpXG4gICAgICAgICAgdGhpcy5zZW5kKGRhdGEpXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAoZSkgPT4ge1xuICAgICAgICB0aGlzLl91cGdyYWRpbmcgPSBmYWxzZVxuICAgICAgICB0aGlzLl9lcnJvckhhbmRsZXIoZSlcbiAgICAgIH1cbiAgICApXG4gIH1cblxuICBfZW1pdCAodHlwZSwgZGF0YSkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXNcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ29wZW4nOlxuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSAnb3BlbidcbiAgICAgICAgdGhpcy5vbm9wZW4gJiYgdGhpcy5vbm9wZW4oeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgdGhpcy5vbmVycm9yICYmIHRoaXMub25lcnJvcih7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnZGF0YSc6XG4gICAgICAgIHRoaXMub25kYXRhICYmIHRoaXMub25kYXRhKHsgdGFyZ2V0LCB0eXBlLCBkYXRhIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdkcmFpbic6XG4gICAgICAgIHRoaXMub25kcmFpbiAmJiB0aGlzLm9uZHJhaW4oeyB0YXJnZXQsIHR5cGUsIGRhdGEgfSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2Nsb3NlJzpcbiAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NlZCdcbiAgICAgICAgdGhpcy5vbmNsb3NlICYmIHRoaXMub25jbG9zZSh7IHRhcmdldCwgdHlwZSwgZGF0YSB9KVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfVxufVxuIl19