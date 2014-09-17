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
	function postEvent (type, data) {
		var message = {
			name    : type,
			columns : _.keys(data),
			points  : [ _.values(data) ]
		};

		return Q.ninvoke(Wreck, "post", options.url, {
			payload : JSON.stringify([ message ])
		});
	}

	plugin.expose("point", function (type, data, callback) {
		return postEvent(type, data).nodeify(callback);
	});

	Joi.validate(options, OPTIONS_SCHEMA, done);
};

exports.register.attributes = _.pick(manifest, [ "name", "version" ]);
