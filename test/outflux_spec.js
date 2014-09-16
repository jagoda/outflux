"use strict";
var fs      = require("fs");
var Lab     = require("lab");
var outflux = require("../lib/outflux");
var path    = require("path");
var Q       = require("q");
var script  = exports.lab = Lab.script();

var before   = script.before;
var describe = script.describe;
var expect   = Lab.expect;
var it       = script.it;

describe("The outflux plugin", function () {
	var manifest;

	before(function (done) {
		var manifestFile = path.join(__dirname, "..", "package.json");

		Q.ninvoke(fs, "readFile", manifestFile, { encoding : "utf8" })
		.then(function (contents) {
			manifest = JSON.parse(contents);
		})
		.nodeify(done);
	});

	it("has a name", function (done) {
		expect(outflux.register.attributes, "name").to.have.property("name", manifest.name);
		done();
	});

	it("has a version", function (done) {
		expect(outflux.register.attributes, "version")
		.to.have.property("version", manifest.version);

		done();
	});
});
