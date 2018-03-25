'use strict';

const moment = require('moment');


module.exports = function(value) {
	let now = moment();
	let parsedValue = moment(new Date(value));

	let delta = now.diff(parsedValue);

	return delta > 0;
};
