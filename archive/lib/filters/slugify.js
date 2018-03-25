'use strict';


module.exports = function(value) {
	return value.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '-');
};
