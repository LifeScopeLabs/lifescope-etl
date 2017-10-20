'use strict';

const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const config = require('config');
const express = require('express');
const httpErrors = require('http-errors');

const csrf = require('../middleware/csrf');
const gid = require('../util/gid');
const hmac = require('../util/hmac');
const loginRequired = require('../middleware/login-required');


let bitscoop = new BitScoop(config.api.key, {
	allowUnauthorized: true
});
let router = express.Router();
let complete = router.route('/complete');
let connection = router.route('/:id');
let connections = router.route('/');


function completeConnection(req, res, next) {
	let mongo = env.databases.mongo;

	Promise.all([
		mongo.db('live').collection('connections').findOne({
			remote_connection_id: gid(req.query.connection_id)
		}),

		mongo.db('live').collection('providers').findOne({
			remote_map_id: gid(req.query.map_id)
		})
	])
		.then(function(result) {
			let [connection, provider] = result;

			if (!connection || !provider) {
				return Promise.reject(httpErrors(404));
			}

			return bitscoop.getMap(req.query.map_id)
				.then(function(remoteProvider) {
					let merged = _.assign(provider, remoteProvider);

					connection.provider = merged;

					return Promise.resolve(connection);
				});
		})
		.then(function(connection) {
			return bitscoop.getConnection(req.query.existing_connection_id || req.query.connection_id)
				.then(function(remoteConnection) {
					let merged = _.assign(remoteConnection, connection);

					return Promise.resolve(merged);
				});
		})
		.then(function(connection) {
			let $set = {
				'auth.status.authorized': true,
				'auth.status.complete': true,
				'status': 'ready'
			};

			if (req.query.existing_connection_id) {
				$set.remote_connection_id = gid(req.query.existing_connection_id);
			}

			return mongo.db('live').collection('connections').updateOne({
				_id: connection._id
			}, {
				$set: $set
			});
		})
		.catch(function(err) {
			next(err);
		});
}

function deleteConnection(req, res, next) {
	let mongo = env.databases.mongo;

	mongo.db('live').collection('providers').findOne({
		remote_map_id: gid(req.body.provider_id)
	})
		.then(function(provider) {
			if (!provider) {
				return Promise.reject(httpErrors(404));
			}

			let signature = hmac(JSON.stringify(req.body), provider.webhook_secret_key.toString('hex'));

			if (signature !== req.headers['x-bitscoop-signature']) {
				return Promise.reject(httpErrors(401));
			}
		})
		.then(function() {
			return mongo.db('live').collection('connections').deleteOne({
				remote_connection_id: gid(req.body.connection_id)
			});
		})
		.catch(function(err) {
			next(err);
		});
}

function reauthorizeConnection(req, res, next) {
	let mongo = env.databases.mongo;

	Promise.all([
		mongo.db('live').collection('connections').findOne({
			remote_connection_id: gid(req.body.connection_id)
		}),

		mongo.db('live').collection('providers').findOne({
			remote_map_id: gid(req.body.provider_id)
		})
	])
		.then(function(result) {
			let [connection, provider] = result;

			if (!connection || !provider) {
				return Promise.reject(httpErrors(404));
			}

			return bitscoop.getMap(req.query.map_id)
				.then(function(remoteProvider) {
					let merged = _.assign(provider, remoteProvider);

					connection.provider = merged;

					return Promise.resolve(connection);
				});
		})
		.then(function(connection) {
			return bitscoop.getConnection(req.queyr.existing_connection_id || req.query.connection_id)
				.then(function(remoteConnection) {
					let merged = _.assign(remoteConnection, connection);

					return Promise.resolve(merged);
				});
		})
		.then(function(connection) {
			return mongo.db('live').collection('connections').updateOne({
				_id: connection._id
			}, {
				$set: {
					'auth.status.authorized': true
				}
			});
		})
		.catch(function(err) {
			next(err);
		});
}


complete.options(function(req, res, next) {
	res.setHeader('Allowed', 'DELETE,OPTIONS,POST');

	res.sendStatus(204);
});

complete.get(function(req, res, next) {
	let validate = env.validate;

	return Promise.all([
		validate('#/types/uuid4', req.query.connection_id),
		validate('#/types/uuid4', req.query.map_id)
	])
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			completeConnection(req, res, next);
		})
		.then(function() {
			res.redirect('/providers');
		});
});

connection.options(function(req, res, next) {
	res.setHeader('Allowed', 'OPTIONS,PATCH');

	res.sendStatus(204);
});

connection.patch(loginRequired(404), csrf.validate, function(req, res, next) {
	let hexId = req.params.id;
	let mongo = env.databases.mongo;
	let validate = env.validate;
	let bitscoopConnection;

	validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			return mongo.db('live').collection('connections').findOne({
				_id: gid(hexId),
				user_id: req.user._id
			})
				.then(function(connection) {
					if (!connection) {
						return Promise.reject(httpErrors(404));
					}

					return bitscoop.getConnection(connection.remote_connection_id.toString('hex'))
						.then(function(remoteConnection) {
							bitscoopConnection = remoteConnection;

							let merged = _.assign({}, remoteConnection, connection);

							return Promise.resolve(merged);
						});
				});
		})
		.then(function(connection) {
			return mongo.db('live').collection('providers').findOne({
				_id: connection.provider_id
			})
				.then(function(provider) {
					if (!provider) {
						return Promise.reject(httpErrors(404));
					}

					return bitscoop.getMap(provider.remote_map_id.toString('hex'))
						.then(function(remoteProvider) {
							let merged = _.assign(provider, remoteProvider);

							connection.provider = merged;

							return Promise.resolve(connection);
						});
				});
		})
		.then(function(connection) {
			let endpoints = [];

			_.each(connection.provider.sources, function(source, name) {
				if (connection.permissions.hasOwnProperty(name) && connection.permissions[name].enabled) {
					endpoints.push(source.mapping);
				}
			});

			bitscoopConnection.endpoints = _.uniq(endpoints);

			return bitscoopConnection.save()
				.then(function(authObj) {
					let promise = Promise.resolve();

					if (connection.auth.type === 'oauth2') {
						promise = promise.then(function() {
							let $set = {
								'auth.status.authorized': false
							};

							return mongo.db('live').collection('connections').updateOne({
								_id: gid(hexId),
								user_id: req.user._id
							}, {
								$set: $set
							});
						});
					}

					return promise.then(function() {
						return Promise.resolve(authObj);
					});
				})
				.catch(function(err) {
					return Promise.reject(err);
				});
		})
		.then(function(authObj) {
			res.json(authObj);
		})
		.catch(function(err) {
			next(err);
		});
});


connections.options(function(req, res, next) {
	res.setHeader('Allowed', 'OPTIONS,POST');

	res.sendStatus(204);
});

connections.post(loginRequired(404), csrf.validate, function(req, res, next) {
	let hexId = req.body.provider_id;
	let name = req.body.name;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	Promise.all([
		validate('#/types/uuid4', hexId),
		validate('#/types/string', name)
	])
		.catch(function() {
			console.log('Connection POST Validation error');

			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			return mongo.db('live').collection('providers').findOne({
				_id: gid(hexId)
			})
				.then(function(provider) {
					if (!provider) {
						return Promise.reject(httpErrors(404));
					}

					return bitscoop.getMap(provider.remote_map_id.toString('hex'))
						.then(function(remoteProvider) {
							let merged = _.assign(provider, remoteProvider);

							return Promise.resolve(merged);
						});
				});
		})
		.then(function(provider) {
			let endpoints = [];
			let connection = {
				frequency: 1,
				enabled: true,
				permissions: {},

				provider: provider,
				provider_id: provider._id
			};

			_.each(provider.sources, function(source, name) {
				if (_.has(req.body, name)) {
					connection.permissions[name] = {
						enabled: true,
						frequency: 1
					};

					endpoints.push(source.mapping);
				}
			});

			endpoints = _.uniq(endpoints);

			return Promise.all([
				bitscoop.createConnection(provider.remote_map_id.toString('hex'), {
					name: name,
					endpoints: endpoints,
					redirect_url: provider.auth.redirect_url + '?map_id=' + provider.remote_map_id.toString('hex')
				}),

				Promise.resolve(connection)
			])
				.then(function(result) {
					let [authObj, connection] = result;

					return mongo.db('live').collection('connections').insertOne({
						_id: gid(),
						auth: {
							status: {
								complete: false
							}
						},
						frequency: 1,
						enabled: true,
						permissions: connection.permissions,
						provider_name: provider.name,
						provider_id: connection.provider_id,
						remote_connection_id: gid(authObj.id),
						user_id: req.user._id
					})
						.then(function() {
							res.redirect(authObj.redirectUrl);
						});
				});
		})

		.catch(function(err) {
			next(err);
		});
});


module.exports = router;
