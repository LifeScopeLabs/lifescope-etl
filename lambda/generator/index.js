'use strict';

const assert = require('assert');

const AWS = require('aws-sdk');
const _ = require('lodash');
const mongodb = require('mongodb');


let sqs = new AWS.SQS();


exports.handler = function(event, context, callback) {
	let db;

	return Promise.resolve()
		.then(function() {
			return new Promise(function(resolve, reject) {
				let address = process.env.MONGO_ADDRESS;
				let options = {
					poolSize: 5
				};

				mongodb.MongoClient.connect(address, options, function(err, database) {
					if (err) {
						reject(err);
					}
					else {
						db = database;
						resolve();
					}
				});
			});
		})
		.then(function() {
			return db.db('live').collection('providers').find({}, {
				_id: true
			}).toArray()
				.then(function(results) {
					let ids = _.map(results, function(result) {
						return result._id;
					});

					return Promise.resolve(ids);
				})
				.then(function(ids) {
					let $match = {
						$and: [
							{
								'auth.status.complete': true,
								'auth.status.authorized': true,
								enabled: true,
								browser: {
									$exists: false
								},
								$runnable: {
									$ne: false
								},
								provider_id: {
									$in: ids
								},
								$and: [
									{
										status: {
											$ne: 'running'
										}
									},
									{
										status: {
											$ne: 'queued'
										}
									},
									{
										status: {
											$ne: 'failed'
										}
									}
								]
							},
							{
								$or: [
									{
										last_run: {
											$lt: new Date(new Date() - 86400000)
										}
									},
									{
										last_run: {
											$exists: false
										}
									}
								]
							}
						]
					};

					return db.db('live').collection('connections').find($match, {
						_id: true
					}).toArray()
						.then(function(connections) {
							console.log('Number of jobs to create: ' + connections.length);

							// The connections parameter is an empty array if
							// there are no connections returned from the db.
							// So checking for length to provide the correct response
							if (connections.length == 0) {
								return Promise.resolve([]);
							}

							let jobs = _.map(connections, function(connection) {
								let attr = {
									connectionId: {
										DataType: 'String',
										StringValue: connection._id.toString('hex')
									}
								};

								let params = {
									QueueUrl: process.env.QUEUE_URL,
									MessageBody: 'Connection ready to be run.',
									MessageAttributes: attr
								};

								return new Promise(function(resolve, reject) {
									sqs.sendMessage(params, function(err, data) {
										if (err) {
											reject(err);
										}
										else {
											resolve();
										}
									});
								})
									.then(function() {
										return db.db('live').collection('connections').update({
											_id: connection._id
										}, {
											$set: {
												status: 'queued'
											}
										})
									});
							});

							return Promise.all(jobs);
						});
				});
		})
		.then(function() {
			console.log('SUCCESSFUL');

			db.close();

			callback(null, null);

			return Promise.resolve();
		})
		.catch(function(err) {
			console.log('UNSUCCESSFUL');

			if (db) {
				db.close();
			}

			callback(err, null);

			return Promise.reject(err);
		});
};
