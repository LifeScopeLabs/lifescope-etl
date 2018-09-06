'use strict';

const AWS = require('aws-sdk');
const _ = require('lodash');
const moment = require('moment');
const mongodb = require('mongodb');

const gid = require('./util/gid');

let sqs = new AWS.SQS();


exports.handler = async function(event, context, callback) {
	let db;
	let userId = event.userId;
	let receiptHandle = event.receiptHandle;

	let address = process.env.MONGO_ADDRESS;
	let options = {
		poolSize: 5
	};

	if (userId == null) {
		return Promise.reject(new Error('Missing User ID'));
	}

	console.log('Estimating locations for user ' + userId);

	userId = gid(userId);

	try {
		db = await new Promise(function(resolve, reject) {
			mongodb.MongoClient.connect(address, options, function(err, database) {
				if (err) {
					console.log(err);
					reject(err);
				}
				else {
					resolve(database);
				}
			});
		});

		let bulkEvents = db.db('live').collection('events').initializeUnorderedBulkOp();
		let bulkLocations = db.db('live').collection('locations').initializeUnorderedBulkOp();

		let user = await db.db('live').collection('users').findOne({
			_id: userId
		});

		let promises = [];

		if (user && (user.last_location_estimation == null || moment().utc().toDate() > moment(user.last_location_estimation).add(1, 'day').utc().toDate())) {
			await db.db('live').collection('users').updateOne({
				_id: userId
			}, {
				$set: {
					location_estimation_status: 'running'
				}
			});

			let eventResult = await db.db('live').collection('events').find({
				user_id: userId
			}).toArray();

			let locationResult = await db.db('live').collection('locations').find({
				estimated: false,
				user_id: userId
			})
				.sort({ datetime: 1 })
				.toArray();

			if (locationResult.length > 0) {
				let dataMap = {};

				_.each(eventResult, function(event) {
					if (event.location == null || _.find(locationResult, function(location) {
						return location._id.toString('hex') === event.location.toString('hex');
					}) == null) {
						let eventId = event._id.toString('hex');
						let _id = event.location ? event.location : gid();

						let priorLocation = _.findLast(locationResult, function(location) {
							return location.datetime < event.datetime;
						});

						let nextLocation = _.find(locationResult, function(location) {
							return location.datetime > event.datetime;
						});

						let priorMoment = moment(priorLocation).utc();
						let nextMoment = moment(nextLocation).utc();
						let eventMoment = moment(event.datetime);
						let priorDiff = Math.abs(priorMoment - eventMoment);
						let nextDiff = Math.abs(nextMoment - eventMoment);

						let estimatedLocation = priorLocation == null ? nextLocation : nextLocation == null ? priorLocation : priorDiff < nextDiff ? priorLocation : nextLocation;

						dataMap[eventId] = {
							identifier: 'estimated:::' + event._id.toString('hex') + ':::' + moment(event.datetime).utc().toJSON(),
							estimated: true,
							datetime: moment(event.datetime).utc().toDate(),
							geo_format: 'lat_lng',
							geolocation: estimatedLocation.geolocation,
							tracked: false,
							updated: moment().utc().toDate()
						};

						bulkLocations.find({
							$or: [
								{
									_id: _id
								},
								{
									identifier: dataMap[eventId].identifier
								},
							],
							user_id: userId
						})
							.upsert()
							.updateOne({
								$set: dataMap[eventId],
								$setOnInsert: {
									_id: _id,
									created: moment().utc().toDate()
								}
							});

						if (bulkLocations.s.currentIndex >= 500) {
							promises.push(bulkLocations.execute());

							bulkLocations = db.db('live').collection('locations').initializeUnorderedBulkOp();
						}

						if (event.location == null) {
							bulkEvents.find({
								identifier: event.identifier,
								user_id: userId
							})
								.upsert()
								.updateOne({
									$set: {
										location: _id
									}
								});

							if (bulkEvents.s.currentIndex >= 500) {
								promises.push(bulkEvents.execute());

								bulkEvents = db.db('live').collection('events').initializeUnorderedBulkOp();
							}
						}
					}
				});

				if (bulkLocations.s.currentIndex > 0) {
					promises.push(bulkLocations.execute());
				}

				if (bulkEvents.s.currentIndex > 0) {
					promises.push(bulkEvents.execute());
				}

			}
		}

		await new Promise(async function(resolve, reject) {
			try {
				await Promise.all(promises);

				console.log('Updating user last_location_estimation');

				await db.db('live').collection('users').updateOne({
					_id: userId
				}, {
					$set: {
						location_estimation_status: 'ready',
						last_location_estimation: moment().utc().toDate()
					}
				});

				resolve();
			} catch(err) {
				console.log(err);

				reject(err);
			}
		});

		let params = {
			QueueUrl: process.env.QUEUE_URL,
			ReceiptHandle: receiptHandle
		};

		await new Promise(function(resolve, reject) {
			sqs.deleteMessage(params, function(err, data) {
				if (err) {
					reject(err);
				}
				else {
					resolve(data);
				}
			});
		});

		console.log('SUCCESSFUL');

		db.close();

		callback(null, null);

		return Promise.resolve();
	} catch(err) {
		console.log('UNSUCCESSFUL');

		let params = {
			QueueUrl: process.env.QUEUE_URL,
			ReceiptHandle: receiptHandle
		};

		await new Promise(function(resolve, reject) {
			sqs.deleteMessage(params, function(err, data) {
				if (err) {
					reject(err);
				}
				else {
					resolve(data);
				}
			});
		});

		await db.db('live').collection('users').updateOne({
			_id: userId
		}, {
			$set: {
				location_estimation_status: 'ready'
			}
		});

		if (db) {
			db.close();
		}

		callback(err, null);

		return Promise.reject(err);
	}

};
