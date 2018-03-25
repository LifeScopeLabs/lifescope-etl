'use strict';

const httpErrors = require('http-errors');


module.exports = function(code) {
	return function(req, res, next) {
		if (req.user) {
			next();
		}
		else {
			next(httpErrors(code) || 404);
		}
	};
};
