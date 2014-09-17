"use strict";
var Fs      = require("fs");
var Hapi    = require("hapi");
var Lab     = require("lab");
var Nock    = require("nock");
var Outflux = require("../lib/outflux");
var Path    = require("path");
var Q       = require("q");
var script  = exports.lab = Lab.script();

var after    = script.after;
var before   = script.before;
var describe = script.describe;
var expect   = Lab.expect;
var it       = script.it;

describe("The outflux plugin", function () {
	var manifest;

	before(function (done) {
		Nock.disableNetConnect();
		done();
	});

	after(function (done) {
		Nock.enableNetConnect();
		done();
	});

	before(function (done) {
		var manifestFile = Path.join(__dirname, "..", "package.json");

		Q.ninvoke(Fs, "readFile", manifestFile, { encoding : "utf8" })
		.then(function (contents) {
			manifest = JSON.parse(contents);
		})
		.nodeify(done);
	});

	it("has a name", function (done) {
		expect(Outflux.register.attributes, "name").to.have.property("name", manifest.name);
		done();
	});

	it("has a version", function (done) {
		expect(Outflux.register.attributes, "version")
		.to.have.property("version", manifest.version);

		done();
	});

	describe("when configured without a database URL", function () {
		var error;
		var pack;

		before(function (done) {
			pack = new Hapi.Pack();

			Q.ninvoke(pack, "register", Outflux)
			.then(
				function () {
					throw new Error("Should not succeed.");
				},
				function (failure) {
					error = failure;
				}
			)
			.nodeify(done);
		});

		it("fails to register", function (done) {
			expect(error, "type").to.be.an.instanceOf(Error);
			expect(error.message, "message").to.match(/url is required/i);
			done();
		});
	});

	describe("when configured correctly", function () {
		var pack;

		before(function (done) {
			var plugins = {
				plugin  : Outflux,
				options : {
					url : "http://example.com/db/test/series?u=foo&p=bar"
				}
			};

			pack = new Hapi.Pack();

			Q.ninvoke(pack, "register", plugins).nodeify(done);
		});

		describe("creating a new point", function () {
			var request;

			before(function (done) {
				request = new Nock("http://example.com")
				.post(
					"/db/test/series?u=foo&p=bar",
					[
						{
							name    : "metric",
							columns : [ "a", "b" ],
							points  : [
								[ 1, 2 ]
							]
						}
					]
				)
				.reply(200);

				pack.plugins.outflux.point("metric", { a : 1, b : 2 }).nodeify(done);
			});

			after(function (done) {
				Nock.cleanAll();
				done();
			});

			it("sends the point to the specified URL", function (done) {
				expect(request.isDone(), "request").to.be.true;
				done();
			});
		});
	});
});
