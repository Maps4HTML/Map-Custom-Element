module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    cssmin: {
      options: {
        mergeIntoShorthands: false,
        roundingPrecision: -1
      },
      combine: {
        files: {
        'dist/mapml.css': ['node_modules/leaflet/dist/leaflet.css', 'src/mapml.css']
        }
      }
    },
    uglify: {
      options: {
       banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/mapml.min.js':    ['<%= rollup.main.dest %>'],
          'dist/web-map.js':      ['src/web-map.js'],
          'dist/mapml-viewer.js': ['src/mapml-viewer.js'],
          'dist/map-area.js':     ['src/map-area.js'],
          'dist/layer.js':        ['src/layer.js'],
          'dist/leaflet.min.js':  ['dist/leaflet-src.js',
                                   'dist/proj4-src.js',
                                   'dist/proj4leaflet.js'],
          'dist/lib/geojson.js':  ['src/geojson/geojson.js']
        } 
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js','test/**/*.spec.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          console: true,
          module: true,
          document: true
        },
        // ensure that jshint keeps processing after an error
        force: true,
        esversion: 11

      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint']
    },
    copy : {
    	 main : {
        files: [
          {
            expand: true,
            cwd: 'node_modules/leaflet/dist/',
            flatten: true,
            filter: 'isFile',
            src: ['leaflet-src.js'],
            dest: 'dist/'
          },
          {
            expand: true,
            cwd: 'node_modules/proj4/dist/',
            flatten: true,
            filter: 'isFile',
            src: ['proj4-src.js'],
            dest: 'dist/'
          },
          {
            expand: true,
            cwd: 'src/proj4leaflet/',
            flatten: true,
            filter: 'isFile',
            src: ['proj4leaflet.js'],
            dest: 'dist/'
          },
          {
            expand: true,
            cwd: 'src',
            flatten: true,
            filter: 'isFile',
            src: ['*.js','*.css','*.md','index.html','package.json'],
            dest: 'dist/'
          },
          {
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: ['index.html'],
            dest: 'dist/'
          }
        ],
        options: {
          // leaflet and proj4 need to set their global variable on the window
          // object in order to use them as modules (it seems).
          process: function (content, srcpath) {
            var wndoh;
            if (srcpath.includes('leaflet-src.js')) {
              console.log('MODIFYING: ', srcpath);
              wndoh = /\}\(this\, \(function \(exports\) \{ \'use strict\'\;/gi;
              return content.replace(wndoh,"}(window, (function (exports) { 'use strict';");
            } else if (srcpath.includes('proj4-src.js')) {
              console.log('MODIFYING: ', srcpath);
              wndoh = /\}\(this\, \(function \(\) \{ \'use strict\'\;/gi;
              return content.replace(wndoh, "}(window, (function () { 'use strict';");
            } else if (srcpath.includes('index.html')) {
              console.log('MODIFYING: ', srcpath);
              var pathToModuleRE =  /dist\/mapml-viewer\.js/gi;
              return content.replace(pathToModuleRE,"./mapml-viewer.js");
            } else {
              return content;
            }
          }
        }
      },
      images: {
        // if you pass images through the process function, it corrupts them,
        // so you have to do this in a separate grunt 'target' ('main' being the
        // default one, I believe).
        files: [
          {
            expand: true,
            cwd: 'node_modules/leaflet/dist/images/',
            flatten: true,
            filter: 'isFile',
            src: ['*.png'],
            dest: 'dist/images/'
          }
        ]
      }
    },
    clean: {
      dist: ['dist'],
      tidyup: ['dist/leaflet-src.js','dist/proj4-src.js','dist/proj4leaflet.js','dist/mapml.js']
    },
    rollup: {
      options: {
        format: 'iife'
      },
      main: {
        dest: 'dist/mapml.js',
        src: 'src/mapml/index.js' // Only one source file is permitted
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-rollup');

  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('default', ['clean:dist', 'copy', 'jshint', 'rollup', 
                                 'uglify', 'cssmin','clean:tidyup']);

};
