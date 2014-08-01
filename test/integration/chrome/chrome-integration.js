'use strict';

require.config({
    baseUrl: 'lib',
    paths: {
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

mocha.setup('bdd');
require(['../tcp-socket-chrome-test'], function() {
    (window.mochaPhantomJS || window.mocha).run();
});