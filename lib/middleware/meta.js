'use strict';

const uuid = require('uuid');


module.exports = function(req, res, next) {
	req.meta = {
		id: uuid(),
		ip: req.realIp,
		method: req.method,
		path: req.originalUrl
	};

	next();
};
