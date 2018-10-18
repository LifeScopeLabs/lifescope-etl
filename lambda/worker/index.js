'use strict';

const assert = require('assert');

const AWS = require('aws-sdk');
const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const moment = require('moment');
const mongodb = require('mongodb');

const gid = require('./util/gid');
const sources = require('./sources');


let bitscoop = new BitScoop(process.env.BITSCOOP_API_KEY);
let sqs = new AWS.SQS();


exports.handler = function(event, context, callback) {
	let db;
	let connectionId = event.connectionId;
	let receiptHandle = event.receiptHandle;

	return Promise.resolve()
		.then(function() {
			let address = process.env.MONGO_ADDRESS;
			let options = {
				poolSize: 5
			};

			if (connectionId == null) {
				return Promise.reject(new Error('Missing Connection ID'));
			}

			connectionId = gid(connectionId);

			return new Promise(function(resolve, reject) {
				mongodb.MongoClient.connect(address, options, function(err, database) {
					if (err) {
						console.log(err);
						reject(err);
					}
					else {
						db = database;

						resolve();
					}
				});
			});
		})
		.then(function(mongo) {
			return db.db('live').collection('connections').findOne({
				_id: connectionId
			})
				.then(function(connection) {

					if (connection == null) {
						return Promise.reject(new Error('No connection with ID ' + connectionId.toString('hex')))
					}

					console.log('Calling Connection ' + connection.remote_connection_id.toString('hex'));
					return bitscoop.getConnection(connection.remote_connection_id.toString('hex'))
						.then(function(remoteConnection) {
							remoteConnection = _.omit(remoteConnection, ['id', 'auth', 'provider_id']);

							_.assign(connection, remoteConnection);

							return Promise.resolve(connection);
						})
						.catch(function(err) {
							console.log(err);

							return Promise.reject(err);
						});
				})
				.then(function(connection) {
					return db.db('live').collection('providers').findOne({
						_id: connection.provider_id
					})
						.then(function(provider) {
							if (provider == null) {
								return Promise.reject(new Error('Connection' + connectionId.toString('hex') + 'has an invalid Provider with ID ' + connection.provider_id.toString('hex') + '.'));
							}

							return bitscoop.getMap(provider.remote_map_id.toString('hex'))
								.then(function(remoteProvider) {
									remoteProvider = _.omit(remoteProvider, ['id', 'auth']);

									_.assign(provider, remoteProvider);

									_.assign(connection, {
										provider: provider
									});

									return Promise.resolve(connection);
								});
						});
				})
				.then(function(connection) {
					return db.db('live').collection('connections').updateOne({
						_id: connection._id
					}, {
						$set: {
							status: 'running'
						}
					})
						.then(function() {
							return Promise.resolve(connection);
						});
				})
				.then(function(connection) {
					let api = bitscoop.api(connection.provider.remote_map_id.toString('hex'));

					let promises = _.map(connection.permissions, function(permission, name) {
						if (permission.enabled) {
							let source = new sources.Source(connection.provider.sources[name], connection, api);

							source.parse = require('./sources/' + connection.provider_name.toLowerCase() + '/parsers/' + name.toLowerCase());
							source.paginate = require('./sources/' + connection.provider_name.toLowerCase() + '/paginators/' + name.toLowerCase());

							return source.paginate(connection, {}, {}, [], db)
								.then(function(data) {
									return source.parse(data, db)
										.catch(function(err) {
											console.log('ERROR WITH PARSE:');
											console.log(err);

											return Promise.reject(err);
										});
								});
						}
						else {
							return Promise.resolve();
						}
					});

					return Promise.all(promises)
						.then(function() {
							let lastRun;
							let promise = Promise.resolve();

							//Google has a rate limit of about 50 email calls per second for each user.
							//Since we have populate each message individually, that can quickly surpass this limit and lock out that user for 24 hours.
							//The solution is to paginate with 1.2-second pauses between each page, getting 40 messages at a time.
							//Since Lambda has a hard cap of 5 minutes, the first run through a user's mailbox could take too long.
							//The fix for that problem, which is here, is to save the nextPageToken on endpoint_data as page_token instead of the new date query
							//and set lastRun to something that will get run again immediately.
							//lastRun gets set to the current datetime only when the initial backlog for Gmail has been completed.
							if (connection.provider.name === 'Google') {
								promise = promise.then(function() {
									return db.db('live').collection('connections').findOne({
										_id: connection._id
									});
								})
									.then(function(connection) {
										if (connection.endpoint_data.gmail_inbox && connection.endpoint_data.gmail_inbox.hasOwnProperty('page_token')) {
											lastRun = moment().utc().subtract(1, 'day').toDate();
										}
										else {
											lastRun = moment().utc().toDate();
										}

										return Promise.resolve();
									});
							}
							else {
								lastRun = moment().utc().toDate();
							}

							return promise.then(function() {
								return db.db('live').collection('connections').updateOne({
									_id: connection._id
								}, {
									$set: {
										last_run: lastRun,
										status: 'ready'
									}
								});
							});
						})
						.catch(function(err) {
							let params = {
								QueueUrl: process.env.DEAD_LETTER_QUEUE_URL,
								MessageBody: 'Connection failed.',
								MessageAttributes: {
									error: {
										DataType: 'String',
										StringValue: JSON.stringify(err)
									}
								}
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

								db.db('live').collection('connections').update({
									_id: connection._id
								}, {
									$set: {
										status: 'ready'
									}
								})
							])
								.then(function() {
									return Promise.reject(err);
								});
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
