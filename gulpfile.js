"use strict";
var fs      = require("fs");
var gulp    = require("gulp");
var jscs    = require("gulp-jscs");
var jshint  = require("gulp-jshint");
var lab     = require("gulp-lab");
var path    = require("path");
var Q       = require("q");
var stylish = require("jshint-stylish");
var _       = require("lodash");

var paths = {
	jscs : path.join(__dirname, ".jscsrc"),

	jshint : {
		source : path.join(__dirname, ".jshintrc"),
		test   : path.join(__dirname, "test", ".jshintrc")
	},

	source : [
		path.join(__dirname, "*.js"),
		path.join(__dirname, "lib", "**", "*.js")
	],

	test : [
		path.join(__dirname, "test", "**", "*_spec.js")
	]
};

function lint (options, files) {
	return gulp.src(files)
	.pipe(jshint(options))
	.pipe(jshint.reporter(stylish))
	.pipe(jshint.reporter("fail"));
}

function loadOptions (path) {
	return Q.ninvoke(fs, "readFile", path, { encoding : "utf8" })
	.then(function (contents) {
		return JSON.parse(contents);
	});
}

function promisefy (stream) {
	var deferred = Q.defer();

	stream.once("finish", deferred.resolve.bind(deferred));
	stream.once("error", deferred.reject.bind(deferred));

	return deferred.promise;
}

function style (options, files) {
	return gulp.src(files).pipe(jscs(options));
}

gulp.task("coverage", function () {
	var options = {
		args : "-p -r html -o " + path.join(__dirname, "coverage.html"),
		opts : { emitLabError : false }
	};

	return gulp.src(paths.test).pipe(lab(options));
});

gulp.task("default", [ "test" ]);

gulp.task("lint", [ "lint-source", "lint-test" ]);

gulp.task("lint-source", function () {
	return loadOptions(paths.jshint.source)
	.then(function (options) {
		return promisefy(lint(options, paths.source));
	});
});

gulp.task("lint-test", function () {
	return Q.all([
		loadOptions(paths.jshint.source),
		loadOptions(paths.jshint.test)
	])
	.spread(function (source, test) {
		var options = _.merge(source, test);
		return promisefy(lint(options, paths.test));
	});
});

gulp.task("style", function () {
	return loadOptions(paths.jscs)
	.then(function (options) {
		return promisefy(style(options, paths.source.concat(paths.test)));
	});
});

gulp.task("test", [ "lint", "style" ], function () {
	var options = {
		args : "-p -t 100",
		opts : { emitLabError : true }
	};

	return gulp.src(paths.test).pipe(lab(options));
});
