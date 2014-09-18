outflux
=======

[![Build Status](https://travis-ci.org/jagoda/outflux.svg?branch=master)](https://travis-ci.org/jagoda/outflux)

> Hapi plugin for sending metrics to InfluxDB.

## Overview

	npm install outflux

`outflux` provides the ability to send metrics to [InfluxDB][influxdb] from
[Hapi][hapi] plugins.

	exports.register = function (plugin, options, done) {
		. . .
		plugin.plugins.outflux.point("metric", { a : 1, b : 2 });
		. . .
	};

## Configuration

The `outflux` plugin can be configured with the following options:

| name | required | description            |
|------|----------|------------------------|
| url  | yes      | The Influx series URL. |

The series URL should be the fully qualified URL (including the username and
password) as specified in the [InfluxDB documentation][influx-queries]. For
example `http://example.com/db/somedb/series?u=username&p=password`.

## API

### outflux.point (type, data)

| parameter | description                  |
|-----------|------------------------------|
| type      | The type of point to create. |
| data      | The data point.              |

Creates a new data point. The `data` object is a standard JavaScript object.
The key names are used as the column names for the point. Points are batched on
one second intervals to improve performance. Returns a promise that is resolved
or rejected when the point is actually sent to the server depending on whether
or not the request was successful.

[hapi]: http://hapijs.com/ "Hapi"
[influxdb]: http://influxdb.com/ "InfluxDB"
[influx-queries]: http://influxdb.com/docs/v0.8/api/reading_and_writing_data.html "InfluxDB API"
