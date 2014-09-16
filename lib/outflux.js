"use strict";
var fs   = require("fs");
var path = require("path");
var _    = require("lodash");

var manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json")));

exports.register = function () {};

exports.register.attributes = _.pick(manifest, [ "name", "version" ]);
