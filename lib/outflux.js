"use strict";
var Fs    = require("fs");
var Joi   = require("joi");
var Path  = require("path");
var Q     = require("q");
var Wreck = require("wreck");
var _     = require("lodash");

var OPTIONS_SCHEMA = Joi.object().keys({
	url : Joi.string().required()
});

var manifest = JSON.parse(Fs.readFileSync(Path.join(__dirname, "..", "package.json")));

exports.register = function (plugin, options, done) {
	var interval = 1000;    // 1 second
	var points   = Object.create(null);
	var timeout  = null;

	function flushQueue () {
		var payload = _.map(_.keys(points), function (name) {
			var queue   = points[name];
			var columns = _.union.apply(_, _.map(queue, _.keys.bind(_)));
			var data    = _.map(queue, function (data) {
				return _.map(columns, function (name) {
					return name in data ? data[name] : null;
				});
			});

			return {
				name    : name,
				columns : columns,
				points  : data
			};
		});

		points  = Object.create(null);
		timeout = null;
		Q.ninvoke(Wreck, "post", options.url, { payload : JSON.stringify(payload) })
		.spread(function (response) {
			if (200 !== response.statusCode) {
				plugin.log(
					[ "outflux", "warning" ],
					"Failed to post metrics to '" + options.url + "'."
				);
			}
		})
		.done();
	}

	function getQueue (type) {
		var queue = points[type];

		if (!queue) {
			queue = points[type] = [];
		}

		return queue;
	}

	function queuePoint (type, data) {
		getQueue(type).push(data);

		if (!timeout) {
			timeout = setTimeout(flushQueue, interval);
		}
	}

	plugin.expose("point", function (type, data) {
		queuePoint(type, data);
	});

	Joi.validate(options, OPTIONS_SCHEMA, done);
};

exports.register.attributes = _.pick(manifest, [ "name", "version" ]);
