'use strict';

require.config({
    baseUrl: '../lib',
    paths: {
        'test': '..',
        'forge': 'forge.min'
    },
    shim: {
        sinon: {
            exports: 'sinon',
        },
        forge: {
            exports: 'forge'
        }
    }
});

// add function.bind polyfill
if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            FNOP = function() {},
            fBound = function() {
                return fToBind.apply(this instanceof FNOP && oThis ? this : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        FNOP.prototype = this.prototype;
        fBound.prototype = new FNOP();

        return fBound;
    };
}

// create chrome.socket object
window.Windows = {};
if (!window.setImmediate) {
    window.setImmediate = function(callback) {
        setTimeout(callback, 0);
    };
}


mocha.setup('bdd');
require(['../unit/tcp-socket-win-test'], function() {
    (window.mochaPhantomJS || window.mocha).run();
});