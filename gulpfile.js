/* eslint-env node */

const {src, dest, task, series, parallel} = require('gulp');
// builders
const minifyJS = require('gulp-babel-minify');
const cleanCSS = require('gulp-clean-css');
const htmlmin = require('gulp-htmlmin');
const gzip = require('gulp-gzip');
// linters
const eslint = require('gulp-eslint');
const csslint = require('gulp-csslint');
const htmllint = require('gulp-htmllint');
// others
const del = require('del');

/* UTILS */

task('clean', () => del`dist`);

/* LINT */

// scripts
task('lint:scripts', () =>
  src('src/js/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError()));

// styles
task('lint:styles', () =>
  src('src/css/**/*.css')
    .pipe(csslint('.csslintrc'))
    .pipe(csslint.formatter()));

// views
task('lint:views', () =>
  src('src/**/*.html')
    .pipe(htmllint({failOnError: true})));

task('lint', parallel('lint:scripts', 'lint:styles', 'lint:views'));

/* BUILD */

// scripts
task('scripts', () =>
  src('src/js/**/*.js')
    .pipe(minifyJS())
    .pipe(dest('dist/js')));

// styles
task('styles', () =>
  src('src/css/**/*.css')
    .pipe(cleanCSS())
    .pipe(dest('dist/css')));

// views
task('views', () =>
  src('src/**/*.html')
    .pipe(htmlmin({
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      decodeEntities: true,
      html5: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      sortAttributes: true,
      sortClassName: true,
      useShortDoctype: true,
    }))
    .pipe(dest('dist')));

// images
task('images', () =>
  src('src/img/**/*')
    .pipe(dest('dist/img')));

// service worker
task('sw', () =>
  src('src/sw.js')
    .pipe(dest('dist')));

task('gzip', () =>
  src('dist/**/*.{html,css,js}')
    .pipe(gzip({
      level: 9,
      skipGrowingFiles: true,
    }))
    .pipe(dest('dist')));

task('build', parallel('scripts', 'styles', 'views', 'images', 'sw'));

/* DEFAULT TASK */
// First, we lint the files. If linting succeeds, we proceed by cleaning the output directory and then making the build
task('default', series('lint', 'clean', 'build', 'gzip'));
