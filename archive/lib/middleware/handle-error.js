'use strict';

const httpErrors = require('http-errors');


module.exports = function(err, req, res, next) {
	let code = (err instanceof httpErrors.HttpError) ? err.status : 500;

	if (code === 500) {
		env.logger.error(err, req.meta);
	}

	if (!res.finished) {
		let template;

		switch(code) {
			case 400:
				template = 'errors/400.html';
				break;

			case 401:
				template = 'errors/401.html';
				break;

			case 403:
				template = 'errors/403.html';
				break;

			case 404:
				template = 'errors/404.html';
				break;

			default:
				template = 'errors/500.html';
				break;
		}

		res.status(code);
		res.render(template, {
			code: code,
			message: (err instanceof httpErrors.HttpError) ? err.message : 'Internal server error.'
		});
	}
};
