'use strict';

const _ = require('lodash');

const createInitialSearches = require('../util/create-initial-searches');


module.exports = function(req, res, next) {
	if (!req.user || req.method !== 'GET') {
		next();
	}
	else {
		let hasInitialSearches = _.get(req.user, 'settings.explorer.initial_searches', false);

		if (hasInitialSearches === true) {
			next();
		}
		else {
			createInitialSearches(req.user._id)
				.then(function() {
					next();
				})
				.catch(function(err) {
					next(err);
				});
		}
	}
};
