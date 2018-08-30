'use strict';

const AWS = require('aws-sdk');
const _ = require('lodash');
const mongodb = require('mongodb');


let sqs = new AWS.SQS();


exports.handler = async function(event, context, callback) {
	let db;

	let address = process.env.MONGO_ADDRESS;
	let options = {
		poolSize: 5
	};

	try {
		db = await new Promise(function(resolve, reject) {
			mongodb.MongoClient.connect(address, options, function(err, database) {
				if (err) {
					reject(err);
				}
				else {
					resolve(database);
				}
			});
		});

		let users = await db.db('live').collection('users').find({
			$or: [
				{
					last_location_estimation: {
						$lt: new Date(new Date() - 86400000)
					}
				},
				{
					last_location_estimation: {
						$exists: false
					}
				}
			]
		}, {
			_id: true
		}).toArray();

		console.log('Number of jobs to create: ' + users.length);

		// The connections parameter is an empty array if
		// there are no connections returned from the db.
		// So checking for length to provide the correct response
		if (users.length === 0) {
			return Promise.resolve([]);
		}

		let jobs = _.map(users, function(user) {
			let attr = {
				userId: {
					DataType: 'String',
					StringValue: user._id.toString('hex')
				}
			};

			let params = {
				QueueUrl: process.env.QUEUE_URL,
				MessageBody: 'User ready to be run.',
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
			});
		});

		await Promise.all(jobs);

		console.log('SUCCESSFUL');

		db.close();

		callback(null, null);

		return Promise.resolve();
	} catch(err) {
		console.log('UNSUCCESSFUL');

		if (db) {
			db.close();
		}

		callback(err, null);

		return Promise.reject(err);
	}
};
