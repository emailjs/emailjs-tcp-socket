'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TCPSocket = void 0;

var DummySocket = function () {
  function DummySocket() {
    _classCallCheck(this, DummySocket);
  }

  _createClass(DummySocket, null, [{
    key: 'open',
    value: function open() {
      throw new Error('Runtime does not offer raw sockets!');
    }
  }]);

  return DummySocket;
}();

if (typeof process !== 'undefined') {
  TCPSocket = require('./node-socket');
} else if (typeof chrome !== 'undefined' && (chrome.socket || chrome.sockets)) {
  TCPSocket = require('./chrome-socket');
} else if ((typeof Windows === 'undefined' ? 'undefined' : _typeof(Windows)) === 'object' && Windows && Windows.Networking && Windows.Networking.Sockets && Windows.Networking.Sockets.StreamSocket) {
  TCPSocket = require('./windows-socket');
} else if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && typeof io === 'function') {
  TCPSocket = require('./socketio-socket');
} else {
  TCPSocket = DummySocket;
}

module.exports = TCPSocket;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zb2NrZXQuanMiXSwibmFtZXMiOlsiVENQU29ja2V0IiwiRHVtbXlTb2NrZXQiLCJFcnJvciIsInByb2Nlc3MiLCJyZXF1aXJlIiwiY2hyb21lIiwic29ja2V0Iiwic29ja2V0cyIsIldpbmRvd3MiLCJOZXR3b3JraW5nIiwiU29ja2V0cyIsIlN0cmVhbVNvY2tldCIsIndpbmRvdyIsImlvIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQSxJQUFJQSxrQkFBSjs7SUFFTUMsVzs7Ozs7OzsyQkFDVztBQUNiLFlBQU0sSUFBSUMsS0FBSixDQUFVLHFDQUFWLENBQU47QUFDRDs7Ozs7O0FBR0gsSUFBSSxPQUFPQyxPQUFQLEtBQW1CLFdBQXZCLEVBQW9DO0FBQ2xDSCxjQUFZSSxRQUFRLGVBQVIsQ0FBWjtBQUNELENBRkQsTUFFTyxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBbEIsS0FBa0NBLE9BQU9DLE1BQVAsSUFBaUJELE9BQU9FLE9BQTFELENBQUosRUFBd0U7QUFDN0VQLGNBQVlJLFFBQVEsaUJBQVIsQ0FBWjtBQUNELENBRk0sTUFFQSxJQUFJLFFBQU9JLE9BQVAseUNBQU9BLE9BQVAsT0FBbUIsUUFBbkIsSUFBK0JBLE9BQS9CLElBQTBDQSxRQUFRQyxVQUFsRCxJQUFnRUQsUUFBUUMsVUFBUixDQUFtQkMsT0FBbkYsSUFBOEZGLFFBQVFDLFVBQVIsQ0FBbUJDLE9BQW5CLENBQTJCQyxZQUE3SCxFQUEySTtBQUNoSlgsY0FBWUksUUFBUSxrQkFBUixDQUFaO0FBQ0QsQ0FGTSxNQUVBLElBQUksUUFBT1EsTUFBUCx5Q0FBT0EsTUFBUCxPQUFrQixRQUFsQixJQUE4QixPQUFPQyxFQUFQLEtBQWMsVUFBaEQsRUFBNEQ7QUFDakViLGNBQVlJLFFBQVEsbUJBQVIsQ0FBWjtBQUNELENBRk0sTUFFQTtBQUNMSixjQUFZQyxXQUFaO0FBQ0Q7O0FBRURhLE9BQU9DLE9BQVAsR0FBaUJmLFNBQWpCIiwiZmlsZSI6InNvY2tldC5qcyIsInNvdXJjZXNDb250ZW50IjpbImxldCBUQ1BTb2NrZXRcblxuY2xhc3MgRHVtbXlTb2NrZXQge1xuICBzdGF0aWMgb3BlbiAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdSdW50aW1lIGRvZXMgbm90IG9mZmVyIHJhdyBzb2NrZXRzIScpXG4gIH1cbn1cblxuaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJykge1xuICBUQ1BTb2NrZXQgPSByZXF1aXJlKCcuL25vZGUtc29ja2V0Jylcbn0gZWxzZSBpZiAodHlwZW9mIGNocm9tZSAhPT0gJ3VuZGVmaW5lZCcgJiYgKGNocm9tZS5zb2NrZXQgfHwgY2hyb21lLnNvY2tldHMpKSB7XG4gIFRDUFNvY2tldCA9IHJlcXVpcmUoJy4vY2hyb21lLXNvY2tldCcpXG59IGVsc2UgaWYgKHR5cGVvZiBXaW5kb3dzID09PSAnb2JqZWN0JyAmJiBXaW5kb3dzICYmIFdpbmRvd3MuTmV0d29ya2luZyAmJiBXaW5kb3dzLk5ldHdvcmtpbmcuU29ja2V0cyAmJiBXaW5kb3dzLk5ldHdvcmtpbmcuU29ja2V0cy5TdHJlYW1Tb2NrZXQpIHtcbiAgVENQU29ja2V0ID0gcmVxdWlyZSgnLi93aW5kb3dzLXNvY2tldCcpXG59IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnICYmIHR5cGVvZiBpbyA9PT0gJ2Z1bmN0aW9uJykge1xuICBUQ1BTb2NrZXQgPSByZXF1aXJlKCcuL3NvY2tldGlvLXNvY2tldCcpXG59IGVsc2Uge1xuICBUQ1BTb2NrZXQgPSBEdW1teVNvY2tldFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRDUFNvY2tldFxuIl19