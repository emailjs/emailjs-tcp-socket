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
            },
            'win-unit': {
                options: {
                    reporter: 'spec'
                },
                src: ['test/unit/win-unit.html']
            }
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/unit/tcp-socket-node-test.js', 'test/integration/tcp-socket-test.js', 'test/unit/tcp-socket-tls-test.js']
            }
        },

        copy: {
            "src-unit": {
                expand: true,
                flatten: true,
                cwd: 'src/',
                src: '*',
                dest: 'test/lib/'
            },
            "src-chrome": {
                expand: true,
                flatten: true,
                cwd: 'src/',
                src: '*',
                dest: 'test/integration/chrome/lib'
            },
            "src-ws": {
                expand: true,
                flatten: true,
                cwd: 'src/',
                src: '*',
                dest: 'test/integration/ws/lib'
            },
            lib: {
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
            chrome: {
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
                dest: 'test/integration/chrome/lib/'
            },
            ws: {
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
                dest: 'test/integration/ws/lib/'
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
        },
        clean: ['test/lib/*', 'test/integration/chrome/lib/*']
    });

    // Load the plugin(s)
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-mocha-phantomjs');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('ws-integration-test', ['express', 'mocha_phantomjs:ws-integration']); // fails in phantomjs
    grunt.registerTask('test', ['jshint', 'mochaTest', 'mocha_phantomjs:chrome', 'mocha_phantomjs:ws-unit' /*, 'ws-integration-test'*/ ]);
    grunt.registerTask('default', ['clean', 'copy', 'test']);
};