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

							console.log(name);
							source.parse = require('./sources/' + connection.provider_name.toLowerCase() + '/parsers/' + name.toLowerCase());
							source.paginate = require('./sources/' + connection.provider_name.toLowerCase() + '/paginators/' + name.toLowerCase());

							return source.paginate(connection)
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
							return db.db('live').collection('connections').updateOne({
								_id: connection._id
							}, {
								$set: {
									last_run: moment.utc().toDate(),
									status: 'ready'
								}
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
										status: 'failed'
									}
								})
							])
								.then(function() {
									return Promise.reject(err);
								});
						});
				})
				.then(function() {
					let params = {
						QueueUrl: process.env.QUEUE_URL,
						ReceiptHandle: receiptHandle
					};

					return new Promise(function(resolve, reject) {
						sqs.deleteMessage(params, function(err, data) {
							if (err) {
								reject(err);
							}
							else {
								resolve(data);
							}
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
