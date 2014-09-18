"use strict";
var Fs      = require("fs");
var Hapi    = require("hapi");
var Lab     = require("lab");
var Nock    = require("nock");
var Outflux = require("../lib/outflux");
var Path    = require("path");
var Q       = require("q");
var script  = exports.lab = Lab.script();
var Sinon   = require("sinon");

var after    = script.after;
var before   = script.before;
var describe = script.describe;
var expect   = Lab.expect;
var it       = script.it;

describe("The outflux plugin", function () {
	var INTERVAL = 5000;

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

	it("is the package entry point", function (done) {
		expect(require(".."), "entry point").to.equal(Outflux);
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

		describe("creating new points", function () {
			var clock;
			var promise;
			var request;

			before(function (done) {
				clock = Sinon.useFakeTimers();

				request = new Nock("http://example.com")
				.post(
					"/db/test/series?u=foo&p=bar",
					[
						{
							name    : "metric1",
							columns : [ "a", "b" ],
							points  : [
								[ 1, 2 ],
								[ 3, null ]
							]
						},
						{
							name    : "metric2",
							columns : [ "c", "d" ],
							points  : [
								[ 5, 6 ]
							]
						}
					]
				)
				.reply(200);

				promise = Q.all([
					pack.plugins.outflux.point("metric1", { a : 1, b : 2 }),
					pack.plugins.outflux.point("metric1", { a : 3 }),
					pack.plugins.outflux.point("metric2", { c : 5, d : 6 })
				]);

				// Need to reset the global state before other frames can execute
				// since tests run in parallel.
				clock.restore();
				// Cause the promise to time out if not fulfilled or rejected.
				promise = promise.timeout(INTERVAL * 2);
				done();
			});

			after(function (done) {
				Nock.cleanAll();
				done();
			});

			it("does not send the metrics immediately", function (done) {
				expect(promise.isPending(), "pending").to.be.true;
				expect(request.isDone(), "request").to.be.false;
				done();
			});

			describe("after 1 second", function () {
				before(function (done) {
					// Wait for the promise to be fulfilled or rejected.
					promise.nodeify(done);
					clock.tick(INTERVAL);
				});

				it("notifies the caller that the metrics were sent", function (done) {
					expect(promise.isFulfilled(), "fulfilled").to.be.true;
					done();
				});

				it("sends a batch of all queued metrics", function (done) {
					expect(request.isDone(), "request").to.be.true;
					done();
				});
			});
		});

		describe("handling request errors", function () {
			var clock;
			var error;
			var promise;
			var request;

			before(function (done) {
				clock = Sinon.useFakeTimers();

				request = new Nock("http://example.com")
				.post(
					"/db/test/series?u=foo&p=bar",
					[
						{
							name    : "test",
							columns : [],
							points  : [ [] ]
						}
					]
				)
				.reply(400);

				promise = pack.plugins.outflux.point("test", {});
				clock.restore();

				promise = promise.timeout(INTERVAL * 2);
				promise.fail(function (failure) {
					error = failure;
				});
				promise.fin(function () {
					done();
				});

				clock.tick(INTERVAL);
			});

			after(function (done) {
				Nock.cleanAll();
				done();
			});

			it("notifies the caller that the metrics were not sent", function (done) {
				expect(promise.isRejected(), "rejected").to.be.true;
				expect(error, "type").to.be.an.instanceOf(Error);
				expect(error.message, "message").to.match(/failed to post/i);
				done();
			});
		});
	});
});
