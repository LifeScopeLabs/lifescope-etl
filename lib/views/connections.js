'use strict';

const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const config = require('config');
const express = require('express');
const httpErrors = require('http-errors');
const moment = require('moment');

const csrf = require('../middleware/csrf');
const gid = require('../util/gid');
const hmac = require('../util/hmac');
const loginRequired = require('../middleware/login-required');
const sessions = require('../sessions');


let bitscoop = new BitScoop(config.api.key, {
	allowUnauthorized: true
});
let domain = config.domain;
let router = express.Router();
let complete = router.route('/complete');
let connection = router.route('/:id');
let connections = router.route('/');

/**
 * Complete login connection
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
function completeLogin(req, res, next) {
	if (req.user == null) {
        let $filter, promise;

        let mongo = env.databases.mongo;

        let associationId = req.cookies['login_assoc'];

        $filter = {
            token: gid(associationId),
            connection_id: gid(req.query.connection_id)
        };

        // Check to see if a valid association_sessions document exist.
        promise = mongo.db('live').collection('association_sessions').count($filter)
            .then(function (n) {
                if (n === 0) {
                    return Promise.reject(new AssociationError('Invalid association session or association session timeout.'));
                }

                return Promise.all([
                    mongo.db('live').collection('association_sessions').remove($filter),

                    // TODO - review to see if we can consolidate getConnection requests.
                    bitscoop.getConnection(req.query.existing_connection_id || req.query.connection_id)
                ])
                .then(function (resolution) {
                    let [, connection] = resolution;

                    if (connection == null) {
                        return Promise.reject(new AssociationError('Invalid connection.'));
                    }

                    if (!_.get(connection, 'auth.status.authorized', false)) {
                        return Promise.reject(new AssociationError('Connection is not authorized. In order to use this account you must grant the requested permissions.'));
                    }

                    return Promise.resolve(connection);
                });
            });

        // Valid session exist, so check to see if a user account exists.
        promise = promise
            .then(function (connection) {
            	return Promise.all([
                	mongo.db('live').collection('users').findOne({
                    	social_accounts: gid(connection.id)
	                }),
					Promise.resolve(connection)
				]);
            })
			.then(function(result) {
				let [user, connection] = result;
				if (user) {
					// user exist
                    return Promise.resolve(user);
				} else {
					// User account has not been created
                    return createUser(req, res, next, connection)
				}
			})
            .then(function (user) {
                if (!user) {
                    return Promise.reject(httpErrors(404));
                }

                return Promise.all([
                    sessions.create(req, user, {
                        persist: true
                    }),
                    Promise.resolve(user),
                    mongo.db('live').collection('users').update({
                        _id: user._id
                    }, {
                        $set: {
                            is_active: true,
                            last_login: moment.utc().toDate()
                        }
                    })
                ]);
            })
            .then(function (resolution) {
                let [session, user] = resolution;

                res.cookie(config.sessions.cookieName, session.token, {
                    domain: domain,
                    secure: true,
                    httpOnly: true,
                    expires: session.expires
                });

                return Promise.resolve(user);
            })
            .catch(function (err) {
                if (err instanceof AssociationError) {
                    res.status(404);
                    res.setHeader('Content-Type', 'text/html');
                    res.render('errors/association.html', {
                        error: err
                    });
                }
                else {
                    return Promise.reject(err);
                }
            })
            .catch(function (err) {
                next(err);
            })
		return promise;
    }
    else {
		return Promise.resolve(req.user);
	}
}

/**
 * Create new user document
 * @param req
 * @param res
 * @param next
 * @param connection
 */
function createUser(req, res, next, connection) {
	let mongo = env.databases.mongo;
    let email, promise;

    let user = {
    	_id: gid(),
        social_accounts: [gid(connection.id)],
        joined: moment.utc().toDate(),
        subscriptions: [gid()]
    };

    if (email) {
    	promise = mongo.db('live').collection('users').count({
        	_upper_email: email.toUpperCase()
        });
    }
    else {
    	promise = Promise.resolve(0);
    }

    return promise
    	.then(function (n) {
        	if (email) {
            	if (n === 0) {
                	user.email = email;
                    user._upper_email = email.toUpperCase();
                }
                else {
                    user.linked_email = email;
                }
            }

            return Promise.all([
            	mongo.db('live').collection('users').insert(user)
            ]);
        })
        .then(function () {
        	return Promise.resolve(user);
        });
}

/**
 * Complete connection
 * @param req
 * @param res
 * @param next
 * @param user
 * @returns {Promise.<TResult>}
 */
function completeConnection(req, res, next, user) {
	let mongo = env.databases.mongo;

	return Promise.all([
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
				'status': 'ready',
                'user_id': user._id
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
	// complete connection
	let validate = env.validate;

	return Promise.all([
		validate('#/types/uuid4', req.query.connection_id),
		validate('#/types/uuid4', req.query.map_id)
	])
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			// Complete login if user wasn't logged in
            return completeLogin(req, res, next);
		})
		.then(function(user) {
			// Complete connection
			return completeConnection(req, res, next, user);
		})
		.then(function() {
			// Users who have already been logged in will redirect to providers
			if (req.user == null) {
                res.redirect('/providers');
            }
            else {
				// Newly logged in users will redirect to the home page
                res.redirect('/');
			}
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

// Need to allow access for logged in and logged out users.
// csrf.validate was removed during testing. Put this back
connections.post(function(req, res, next) {
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
			// Get provider by hexId
			return mongo.db('live').collection('providers').findOne({
				_id: gid(hexId)
			})
				.then(function(provider) {
					if (!provider) {
						return Promise.reject(httpErrors(404));
					}

					// Makes a connection with Bitscoop and get map.
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

			// Store valid endpoints.
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

			// Create a Bitscoop connection.
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


                    return Promise.all([
                        insertAssociationSessions(req, res, next, authObj),
                        insertConnection(req, res, next, authObj,connection)
					])
						.then(function(results) {
                            res.redirect(authObj.redirectUrl)
						});

				});
		})

		.catch(function(err) {
			next(err);
		});
});

/**
 * Insert Association Session if req.user is null
 * @param req
 * @param res
 * @param next
 * @param authObj
 * @returns {*}
 */
function insertAssociationSessions(req, res, next, authObj) {
    if (req.user == null) {
        let mongo = env.databases.mongo;
        // Only run if the user is not logged in
        let connectionId = authObj.id;
        let redirectUrl = authObj.redirectUrl;

        let token = gid();
        let expiration = moment.utc().add(600, 'seconds').toDate();
        // We don't need to have a different cookie for each provider.
		// Review if we do need to have a different cookie for each provider.
        let cookieName = 'login_assoc';

        return mongo.db('live').collection('association_sessions').insert({
            _id: gid(),
            token: token,
            connection_id: gid(connectionId),
            ttl: expiration
        })
            .then(function (result) {
            	// Create cookie so user can login/signup after Oauth validation.
                res.cookie(cookieName, token.toString('hex'), {
                    domain: domain,
                    secure: true,
                    httpOnly: true,
                    expires: expiration
                });
            })
    }
    return Promise.resolve();
}

/**
 * Create initial connection
 * @param req
 * @param res
 * @param next
 * @param authObj
 * @param connection
 * @returns {Promise.<TResult>}
 */
function insertConnection(req, res, next, authObj,connection) {
    let mongo = env.databases.mongo;
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
        provider_name: connection.provider.name,
        provider_id: connection.provider_id,
        remote_connection_id: gid(authObj.id),
    })
}

module.exports = router;
