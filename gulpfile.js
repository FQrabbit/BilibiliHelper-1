var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var lazypipe = require('lazypipe');
var fs = require('fs');
var pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

var filename = 'BilibiliHelper-V' + pkg.version + '.' + (process.env.TRAVIS_BUILD_NUMBER || 0);
var path = 'release';
var mainTask = ['html', 'css', 'copy', 'manifest'];

$.jshintChannel = lazypipe()
    .pipe($.jshint)
    .pipe($.jshint.reporter, 'jshint-stylish')
    .pipe($.jshint.reporter, 'fail');

gulp.task('debug', $.sequence('set:d', ['script', 'live'], mainTask));
gulp.task('release', $.sequence('set:r', ['script', 'live'], mainTask, 'zip'));
gulp.task('default', function() {
    console.log('Please use `release` or `debug` task!');
});

gulp.task('set:r', function() {
    path = 'release';
    return;
});
gulp.task('set:d', function() {
    path = 'debug';
    return;
});

gulp.task('live', function() {
    return gulp.src('src/live/*.js')
        .pipe($.order(['Helper.js', 'Module*.js', 'Func*.js', '!Core.js', 'Core.js']))
        .pipe($.jshintChannel())
        .pipe($.concat('live.js'))
        .pipe($.if(path == 'release', $.babel({presets: ['babili']})))
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(path + '/src/'));
});
gulp.task('script', function() {
    return gulp.src(['src/**/!(*.min).js', '!src/live/*.js'])
        .pipe($.jshintChannel())
        .pipe($.if(path == 'release', $.babel({presets: ['babili']})))
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(path + '/src/'));
});
gulp.task('html', function() {
    return gulp.src('src/**/*.html')
        .pipe($.if(path == 'release', $.htmlmin({
            collapseBooleanAttributes: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            quoteCharacter: '"'
        })))
        .pipe(gulp.dest(path + '/src/'));
});
gulp.task('css', function() {
    return gulp.src('src/**/!(*.min).css')
        .pipe($.if(path == 'release', $.cleanCss()))
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(path + '/src/'));
});
gulp.task('copy', function() {
    return gulp.src(['**/*.*', '!**/*.html', '!**/!(*.min).js', '!**/!(*.min).css', '!live/**', '!manifest.json'], {cwd: './src'})
        .pipe(gulp.dest(path + '/src/'));
});
gulp.task('manifest', function() {
    var manifest = JSON.parse(fs.readFileSync('./src/manifest.json', 'utf8'));
    manifest.version = pkg.version + '.' + (path == 'release' ? process.env.TRAVIS_BUILD_NUMBER : '0');
    manifest.description = pkg.description;
    if (!fs.existsSync(path + '/src')) {
        fs.mkdirSync(path);
        fs.mkdirSync(path + '/src');
    }
    fs.writeFileSync(path + '/src/manifest.json', JSON.stringify(manifest, null, '  '), {flag: 'w+'});
    return;
});
gulp.task('zip', function() {
    return gulp.src(path + '/src/**')
        .pipe($.archiver(filename + '.zip'))
        .pipe(gulp.dest(path + '/'));
});
