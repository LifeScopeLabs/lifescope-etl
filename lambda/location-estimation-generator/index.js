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
			$and: [
				{
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
				},
				{
					$or: [
						{
							location_estimation_status: 'ready'
						},
						{
							location_estimation_status: {
								$exists: false
							}
						}
					]
				}
			]
		}, {
			_id: true
		}).toArray();

		console.log('Number of jobs to create: ' + users.length);

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

			return Promise.all([
				new Promise(function(resolve, reject) {
					sqs.sendMessage(params, function(err, data) {
						if (err) {
							reject(err);
						}
						else {
							resolve();
						}
					});
				}),

				db.db('live').collection('users').update({
					_id: user._id
				}, {
					$set: {
						location_estimation_status: 'queued'
					}
				})
			])
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
