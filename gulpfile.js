'use strict';
var path = require('path');
var gulp = require('gulp');
var eslint = require('gulp-eslint');
var excludeGitignore = require('gulp-exclude-gitignore');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var plumber = require('gulp-plumber');
let ts = require("gulp-typescript");

let tsProject = ts.createProject("./tsconfig.json");

gulp.task('static', function (done) {
  gulp.src(['test/**/*.js', 'lib/*.js', 'lib/commands/*.js', '*.js'])
    .pipe(excludeGitignore())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
  done();
});


gulp.task('ts', function (done) {
  return tsProject.src()
    .pipe(tsProject())
    .js.pipe(gulp.dest("dist"));
});

gulp.task('pre-test', function (done) {
  gulp.src('dist/**/*.js')
    .pipe(excludeGitignore())
    .pipe(istanbul({
      includeUntested: true
    }))
    .pipe(istanbul.hookRequire());
  done();
});

gulp.task('mocha', function(done) {
  let mochaErr;

  gulp.src('dist/test/*.js')
    .pipe(plumber())
    .pipe(mocha({reporter: 'spec'}))
    .on('error', function (err) {
      console.error('error' + err);
      mochaErr = err;
    })
    .pipe(istanbul.writeReports())
    .on('end', function () {
      //console.error('end:' + mochaErr);
      done(mochaErr);
      //cb(mochaErr);
    });

});

gulp.task('set-test-node-env', function(done) {
  process.env.NODE_ENV = 'test';
  done();
});

gulp.task('test', gulp.series('ts','pre-test','set-test-node-env','mocha'));

gulp.task('watch', function () {
  gulp.watch(['lib/**/*.js', 'test/**'], ['test']);
});

gulp.task('default', gulp.series('static', 'test'));
