'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _timers = require('core-js/library/web/timers');

// setZeroTimeout slightly adapted from
// https://github.com/shahyar/setZeroTimeout-js (CC BY 3.0).
// Provides a function similar to setImmediate() on Chrome.
var timeouts = [];
var msgName = 'hackyVersionOfSetImmediate';

function postTimeout(fn) {
  timeouts.push(fn);
  postMessage(msgName, '*');
}
function handleMessage(event) {
  if (event.source === window && event.data === msgName) {
    if (event.stopPropagation) {
      event.stopPropagation();
    }
    if (timeouts.length) {
      try {
        timeouts.shift()();
      } catch (e) {
        // Throw in an asynchronous closure to prevent setZeroTimeout from hanging due to error
        (0, _timers.setTimeout)(function (e) {
          return function () {
            throw e.stack || e;
          };
        }(e), 0);
      }
    }
    if (timeouts.length) {
      // more left?
      postMessage(msgName, '*');
    }
  }
}

var fn = void 0;
if (typeof setImmediate !== 'undefined') {
  fn = setImmediate;
} else if (typeof window !== 'undefined') {
  window.addEventListener('message', handleMessage, true);
  fn = postTimeout;
} else {
  fn = function fn(f) {
    return (0, _timers.setTimeout)(f, 0);
  };
}

exports.default = fn;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy90aW1lb3V0LmpzIl0sIm5hbWVzIjpbInRpbWVvdXRzIiwibXNnTmFtZSIsInBvc3RUaW1lb3V0IiwiZm4iLCJwdXNoIiwicG9zdE1lc3NhZ2UiLCJoYW5kbGVNZXNzYWdlIiwiZXZlbnQiLCJzb3VyY2UiLCJ3aW5kb3ciLCJkYXRhIiwic3RvcFByb3BhZ2F0aW9uIiwibGVuZ3RoIiwic2hpZnQiLCJlIiwic3RhY2siLCJzZXRJbW1lZGlhdGUiLCJhZGRFdmVudExpc3RlbmVyIiwiZiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsV0FBVyxFQUFqQjtBQUNBLElBQU1DLFVBQVUsNEJBQWhCOztBQUVBLFNBQVNDLFdBQVQsQ0FBc0JDLEVBQXRCLEVBQTBCO0FBQ3hCSCxXQUFTSSxJQUFULENBQWNELEVBQWQ7QUFDQUUsY0FBWUosT0FBWixFQUFxQixHQUFyQjtBQUNEO0FBQ0QsU0FBU0ssYUFBVCxDQUF3QkMsS0FBeEIsRUFBK0I7QUFDN0IsTUFBSUEsTUFBTUMsTUFBTixLQUFpQkMsTUFBakIsSUFBMkJGLE1BQU1HLElBQU4sS0FBZVQsT0FBOUMsRUFBdUQ7QUFDckQsUUFBSU0sTUFBTUksZUFBVixFQUEyQjtBQUN6QkosWUFBTUksZUFBTjtBQUNEO0FBQ0QsUUFBSVgsU0FBU1ksTUFBYixFQUFxQjtBQUNuQixVQUFJO0FBQ0ZaLGlCQUFTYSxLQUFUO0FBQ0QsT0FGRCxDQUVFLE9BQU9DLENBQVAsRUFBVTtBQUNWO0FBQ0EsZ0NBQVksVUFBVUEsQ0FBVixFQUFhO0FBQ3ZCLGlCQUFPLFlBQVk7QUFDakIsa0JBQU1BLEVBQUVDLEtBQUYsSUFBV0QsQ0FBakI7QUFDRCxXQUZEO0FBR0QsU0FKVyxDQUlWQSxDQUpVLENBQVosRUFJTyxDQUpQO0FBS0Q7QUFDRjtBQUNELFFBQUlkLFNBQVNZLE1BQWIsRUFBcUI7QUFBRTtBQUNyQlAsa0JBQVlKLE9BQVosRUFBcUIsR0FBckI7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsSUFBSUUsV0FBSjtBQUNBLElBQUksT0FBT2EsWUFBUCxLQUF3QixXQUE1QixFQUF5QztBQUN2Q2IsT0FBS2EsWUFBTDtBQUNELENBRkQsTUFFTyxJQUFJLE9BQU9QLE1BQVAsS0FBa0IsV0FBdEIsRUFBbUM7QUFDeENBLFNBQU9RLGdCQUFQLENBQXdCLFNBQXhCLEVBQW1DWCxhQUFuQyxFQUFrRCxJQUFsRDtBQUNBSCxPQUFLRCxXQUFMO0FBQ0QsQ0FITSxNQUdBO0FBQ0xDLE9BQUs7QUFBQSxXQUFLLHdCQUFXZSxDQUFYLEVBQWMsQ0FBZCxDQUFMO0FBQUEsR0FBTDtBQUNEOztrQkFFY2YsRSIsImZpbGUiOiJ0aW1lb3V0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2V0VGltZW91dCB9IGZyb20gJ2NvcmUtanMvbGlicmFyeS93ZWIvdGltZXJzJ1xuXG4vLyBzZXRaZXJvVGltZW91dCBzbGlnaHRseSBhZGFwdGVkIGZyb21cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zaGFoeWFyL3NldFplcm9UaW1lb3V0LWpzIChDQyBCWSAzLjApLlxuLy8gUHJvdmlkZXMgYSBmdW5jdGlvbiBzaW1pbGFyIHRvIHNldEltbWVkaWF0ZSgpIG9uIENocm9tZS5cbmNvbnN0IHRpbWVvdXRzID0gW11cbmNvbnN0IG1zZ05hbWUgPSAnaGFja3lWZXJzaW9uT2ZTZXRJbW1lZGlhdGUnXG5cbmZ1bmN0aW9uIHBvc3RUaW1lb3V0IChmbikge1xuICB0aW1lb3V0cy5wdXNoKGZuKVxuICBwb3N0TWVzc2FnZShtc2dOYW1lLCAnKicpXG59XG5mdW5jdGlvbiBoYW5kbGVNZXNzYWdlIChldmVudCkge1xuICBpZiAoZXZlbnQuc291cmNlID09PSB3aW5kb3cgJiYgZXZlbnQuZGF0YSA9PT0gbXNnTmFtZSkge1xuICAgIGlmIChldmVudC5zdG9wUHJvcGFnYXRpb24pIHtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgfVxuICAgIGlmICh0aW1lb3V0cy5sZW5ndGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRpbWVvdXRzLnNoaWZ0KCkoKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBUaHJvdyBpbiBhbiBhc3luY2hyb25vdXMgY2xvc3VyZSB0byBwcmV2ZW50IHNldFplcm9UaW1lb3V0IGZyb20gaGFuZ2luZyBkdWUgdG8gZXJyb3JcbiAgICAgICAgc2V0VGltZW91dCgoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgZS5zdGFjayB8fCBlXG4gICAgICAgICAgfVxuICAgICAgICB9KGUpKSwgMClcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRpbWVvdXRzLmxlbmd0aCkgeyAvLyBtb3JlIGxlZnQ/XG4gICAgICBwb3N0TWVzc2FnZShtc2dOYW1lLCAnKicpXG4gICAgfVxuICB9XG59XG5cbmxldCBmblxuaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgIT09ICd1bmRlZmluZWQnKSB7XG4gIGZuID0gc2V0SW1tZWRpYXRlXG59IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgaGFuZGxlTWVzc2FnZSwgdHJ1ZSlcbiAgZm4gPSBwb3N0VGltZW91dFxufSBlbHNlIHtcbiAgZm4gPSBmID0+IHNldFRpbWVvdXQoZiwgMClcbn1cblxuZXhwb3J0IGRlZmF1bHQgZm5cbiJdfQ==