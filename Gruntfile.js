module.exports = function(grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: ['*.js', 'src/*.js', 'test/unit/*.js', 'test/integration/*.js', 'test/integration/ws/*.js', 'ws-proxy/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        connect: {
            dev: {
                options: {
                    port: 12345,
                    base: '.',
                    keepalive: true
                }
            }
        },

        mocha_phantomjs: {
            chrome: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/unit/chrome-unit.html']
            },
            'ws-unit': {
                options: {
                    reporter: 'spec'
                },
                src: ['test/unit/ws-unit.html']
            },
            'ws-integration': {
                options: {
                    reporter: 'spec'
                },
                src: ['test/integration/ws/integration.html']
            }
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/unit/tcp-socket-node-test.js', 'test/integration/tcp-socket-test.js']
            }
        },

        copy: {
            all: {
                expand: true,
                flatten: true,
                cwd: 'src/',
                src: ['tcp-socket.js'],
                dest: 'test/integration/chrome'
            },
            npm: {
                expand: true,
                flatten: true,
                cwd: 'node_modules/',
                src: [
                    'mocha/mocha.js',
                    'mocha/mocha.css',
                    'chai/chai.js',
                    'node-forge/js/forge.min.js',
                    'sinon/pkg/sinon.js',
                    'requirejs/require.js'
                ],
                dest: 'test/lib/'
            },
        },
        express: {
            options: {
                port: 8889
            },
            all: {
                options: {
                    script: 'ws-proxy/server.js',
                    node_env: 'integration'
                }
            }
        }
    });

    // Load the plugin(s)
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-mocha-phantomjs');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-express-server');

    grunt.registerTask('ws-integration-test', ['express', 'mocha_phantomjs:ws-integration']); // fails in phantomjs
    grunt.registerTask('test', ['jshint', 'mochaTest', 'mocha_phantomjs:chrome', 'mocha_phantomjs:ws-unit'/*, 'ws-integration-test'*/]);

    grunt.registerTask('default', ['copy', 'test']);
};