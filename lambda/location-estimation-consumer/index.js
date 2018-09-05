'use strict';

const AWS = require('aws-sdk');
const _ = require('lodash');
const mongodb = require('mongodb');

const gid = require('./util/gid');


let sqs = new AWS.SQS();
let lambda = new AWS.Lambda;
let receiptHandleMap = {};


exports.handler = async function(event, context, callback) {
	let db;

	let params = {
		QueueUrl: process.env.QUEUE_URL,
		MaxNumberOfMessages: 10,
		MessageAttributeNames: [
			'All'
		]
	};

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

		let result = await new Promise(function(resolve, reject) {
			sqs.receiveMessage(params, function(err, data) {
				if (err) {
					reject(err);
				}
				else {
					resolve(data);
				}
			});
		});

		let messages = result.Messages;

		if (messages == null) {
			console.log('No messages');

			db.close();

			callback(null, null);

			return Promise.resolve([]);
		}

		let ids = _.map(messages, function(message) {
			let attr = message.MessageAttributes;

			receiptHandleMap[attr.userId.StringValue] = message.ReceiptHandle;

			return gid(attr.userId.StringValue);
		});

		let users = await db.db('live').collection('users').find({
			_id: {
				$in: ids
			}
		}).toArray();

		console.log('Users to run: ');
		console.log(users);

		let jobs = _.map(users, function(user) {
			let stringId = user._id.toString('hex');

			let payload = {
				userId: stringId,
				receiptHandle: receiptHandleMap[stringId]
			};

			let params = {
				FunctionName: process.env.WORKER_FUNCTION_ARN,
				InvocationType: 'Event',
				Payload: JSON.stringify(payload)
			};

			return new Promise(function(resolve, reject) {
				lambda.invoke(params, function(err, data) {
					if (err) {
						reject(err);
					}
					else {
						resolve(data);
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
