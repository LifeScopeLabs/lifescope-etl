const _ = require('lodash');
const moment = require('moment');
const nunjucks = require('nunjucks');


var environment = new nunjucks.Environment();

environment.addFilter('get', function(obj, prop) {
	return _.get(obj, prop);
});

environment.addFilter('date', function(obj, format) {
	if (format == null) {
		format = 'datetime';
	}

	switch(format) {
		case 'date':
			format = 'ddd MMM D, YYYY';
			break;
		case 'time':
			format = 'h:mm A';
			break;
		case 'shortdate':
			format = 'M/D/YY';
			break;
		case 'datetime':
			format = 'M/D/YY h:mm A';
			break;
	}

	return obj.format(format);
});

module.exports = environment;
