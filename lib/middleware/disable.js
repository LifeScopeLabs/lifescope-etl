'use strict';

const httpErrors = require('http-errors');


function disable(req, res, next) {
	next(httpErrors(404));
}

module.exports = disable;
