'use strict';

const fs = require('fs');

const glob = require('glob');


function find(pattern, options) {
	return new Promise(function(resolve, reject) {
		glob(pattern, options, function(err, files) {
			if (err) {
				reject(err);
			}
			else {
				resolve(files);
			}
		});
	});
}

function readfile(name) {
	return new Promise(function(resolve, reject) {
		fs.readFile(name, function(err, buffer) {
			if (err) {
				reject(err);
			}
			else {
				resolve(buffer);
			}
		});
	});
}


module.exports = {
	find: find,
	readfile: readfile
};
