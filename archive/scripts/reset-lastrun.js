'use strict';

const Bristol = require('bristol').Bristol;
const Promise = require('bluebird');
const config = require('config');
const mongodb = require('mongodb');


let logger = new Bristol();

logger.addTarget('console')
	.withFormatter('human')
	.withLowestSeverity('debug');


Promise.all([
	new Promise(function(resolve, reject) {
		let address = config.databases.mongo.address;
		let options = config.databases.mongo.options;

		mongodb.MongoClient.connect(address, options, function(err, db) {
			if (err) {
				reject(err);
			}
			else {
				resolve(db);
			}
		});
	})
])
	.then(function(result) {
		let [db] = result;

		return db.db('live').collection('connections').update({}, {
			$unset: {
				last_run: true
			}
		}, {
			multi: true
		});
	})
	.then(function(result) {
		let matching = result.result.n;
		let modified = result.result.nModified;

		logger.info('Field "last_run" unset from ' + modified + ' of ' + matching + ' matching connections.');

		process.exit(0);
	})
	.catch(function(err) {
		logger.error(err);
		process.exit(1);
	});


process.stdin.resume();
