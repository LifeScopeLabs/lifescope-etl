'use strict';

// TODO - Remove String format
const format = require('string-format');
const onHeaders = require('on-headers');


module.exports = function(logger) {
	return function(req, res, next) {
		let start = new Date();

		logger.debug('Request received.', req.meta);

		onHeaders(res, function() {
			let duration = new Date() - start;
			let location = res.get('location');

			if (location) {
				logger.debug(format('Response with status {0} in {1} ms. Location: {2}', res.statusCode, duration, location), req.meta);
			}
			else {
				logger.debug(format('Response with status {0} in {1} ms.', res.statusCode, duration), req.meta);
			}
		});

		next();
	};
};
