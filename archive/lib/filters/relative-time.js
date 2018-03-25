'use strict';

const moment = require('moment');


module.exports = function(value) {
	let parsedValue = moment(new Date(value));

	return moment(parsedValue).fromNow();
};
