module.exports = function(grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: ['*.js', 'src/*.js', 'test/unit/*.js', 'test/integration/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/unit/tcp-socket-test.js', 'test/integration/tcp-socket-test.js']
            }
        },

        copy: {
            all: {
                expand: true,
                flatten: true,
                cwd: 'src/',
                src: ['tcp-socket.js'],
                dest: 'test/integration/chrome'
            }
        }
    });

    // Load the plugin(s)
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('test', ['jshint', 'mochaTest']);
    grunt.registerTask('default', ['copy', 'test']);
};