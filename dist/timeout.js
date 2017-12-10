'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = postTimeout;
// setZeroTimeout slightly adapted from
// https://github.com/shahyar/setZeroTimeout-js (CC BY 3.0).
// Provides a function similar to setImmediate() on Chrome.
var timeouts = [];
var msgName = 'hackyVersionOfSetImmediate';

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
        setTimeout(function (e) {
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

window && window.addEventListener('message', handleMessage, true);

function postTimeout(fn) {
  timeouts.push(fn);
  postMessage(msgName, '*');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy90aW1lb3V0LmpzIl0sIm5hbWVzIjpbInBvc3RUaW1lb3V0IiwidGltZW91dHMiLCJtc2dOYW1lIiwiaGFuZGxlTWVzc2FnZSIsImV2ZW50Iiwic291cmNlIiwid2luZG93IiwiZGF0YSIsInN0b3BQcm9wYWdhdGlvbiIsImxlbmd0aCIsInNoaWZ0IiwiZSIsInNldFRpbWVvdXQiLCJzdGFjayIsInBvc3RNZXNzYWdlIiwiYWRkRXZlbnRMaXN0ZW5lciIsImZuIiwicHVzaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7a0JBK0J3QkEsVztBQS9CeEI7QUFDQTtBQUNBO0FBQ0EsSUFBTUMsV0FBVyxFQUFqQjtBQUNBLElBQU1DLFVBQVUsNEJBQWhCOztBQUVBLFNBQVNDLGFBQVQsQ0FBd0JDLEtBQXhCLEVBQStCO0FBQzdCLE1BQUlBLE1BQU1DLE1BQU4sS0FBaUJDLE1BQWpCLElBQTJCRixNQUFNRyxJQUFOLEtBQWVMLE9BQTlDLEVBQXVEO0FBQ3JELFFBQUlFLE1BQU1JLGVBQVYsRUFBMkI7QUFDekJKLFlBQU1JLGVBQU47QUFDRDtBQUNELFFBQUlQLFNBQVNRLE1BQWIsRUFBcUI7QUFDbkIsVUFBSTtBQUNGUixpQkFBU1MsS0FBVDtBQUNELE9BRkQsQ0FFRSxPQUFPQyxDQUFQLEVBQVU7QUFDVjtBQUNBQyxtQkFBWSxVQUFVRCxDQUFWLEVBQWE7QUFDdkIsaUJBQU8sWUFBWTtBQUNqQixrQkFBTUEsRUFBRUUsS0FBRixJQUFXRixDQUFqQjtBQUNELFdBRkQ7QUFHRCxTQUpXLENBSVZBLENBSlUsQ0FBWixFQUlPLENBSlA7QUFLRDtBQUNGO0FBQ0QsUUFBSVYsU0FBU1EsTUFBYixFQUFxQjtBQUFFO0FBQ3JCSyxrQkFBWVosT0FBWixFQUFxQixHQUFyQjtBQUNEO0FBQ0Y7QUFDRjs7QUFFREksVUFBVUEsT0FBT1MsZ0JBQVAsQ0FBd0IsU0FBeEIsRUFBbUNaLGFBQW5DLEVBQWtELElBQWxELENBQVY7O0FBRWUsU0FBU0gsV0FBVCxDQUFzQmdCLEVBQXRCLEVBQTBCO0FBQ3ZDZixXQUFTZ0IsSUFBVCxDQUFjRCxFQUFkO0FBQ0FGLGNBQVlaLE9BQVosRUFBcUIsR0FBckI7QUFDRCIsImZpbGUiOiJ0aW1lb3V0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gc2V0WmVyb1RpbWVvdXQgc2xpZ2h0bHkgYWRhcHRlZCBmcm9tXG4vLyBodHRwczovL2dpdGh1Yi5jb20vc2hhaHlhci9zZXRaZXJvVGltZW91dC1qcyAoQ0MgQlkgMy4wKS5cbi8vIFByb3ZpZGVzIGEgZnVuY3Rpb24gc2ltaWxhciB0byBzZXRJbW1lZGlhdGUoKSBvbiBDaHJvbWUuXG5jb25zdCB0aW1lb3V0cyA9IFtdXG5jb25zdCBtc2dOYW1lID0gJ2hhY2t5VmVyc2lvbk9mU2V0SW1tZWRpYXRlJ1xuXG5mdW5jdGlvbiBoYW5kbGVNZXNzYWdlIChldmVudCkge1xuICBpZiAoZXZlbnQuc291cmNlID09PSB3aW5kb3cgJiYgZXZlbnQuZGF0YSA9PT0gbXNnTmFtZSkge1xuICAgIGlmIChldmVudC5zdG9wUHJvcGFnYXRpb24pIHtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgfVxuICAgIGlmICh0aW1lb3V0cy5sZW5ndGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRpbWVvdXRzLnNoaWZ0KCkoKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBUaHJvdyBpbiBhbiBhc3luY2hyb25vdXMgY2xvc3VyZSB0byBwcmV2ZW50IHNldFplcm9UaW1lb3V0IGZyb20gaGFuZ2luZyBkdWUgdG8gZXJyb3JcbiAgICAgICAgc2V0VGltZW91dCgoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgZS5zdGFjayB8fCBlXG4gICAgICAgICAgfVxuICAgICAgICB9KGUpKSwgMClcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRpbWVvdXRzLmxlbmd0aCkgeyAvLyBtb3JlIGxlZnQ/XG4gICAgICBwb3N0TWVzc2FnZShtc2dOYW1lLCAnKicpXG4gICAgfVxuICB9XG59XG5cbndpbmRvdyAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGhhbmRsZU1lc3NhZ2UsIHRydWUpXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBvc3RUaW1lb3V0IChmbikge1xuICB0aW1lb3V0cy5wdXNoKGZuKVxuICBwb3N0TWVzc2FnZShtc2dOYW1lLCAnKicpXG59XG4iXX0=