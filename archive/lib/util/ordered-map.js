'use strict';

const _ = require('lodash');


function orderedMap(natural, results, fn) {
	let map = {};

	for (let i = 0; i < results.length; i++) {
		map[results[i]._id.toString('hex')] = results[i];
	}

	return _.map(natural, function(id) {
		if (id == null) {
			return null;
		}
		else {
			return fn(map[id.toString('hex')]);
		}
	});
}


module.exports = orderedMap;
