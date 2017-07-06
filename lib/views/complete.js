'use strict';

const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const config = require('config');
const cookie = require('cookie');
const express = require('express');
const httpErrors = require('http-errors');
const human = require('humanparser');
const moment = require('moment');
const uuid = require('uuid');

const gid = require('../util/gid');
const sessions = require('../sessions');

let router = express.Router();
let complete = router.route('/');

let bitscoop = new BitScoop(config.api.key);

class AssociationError extends Error {}


complete.get(function(req, res, next) {
	let $filter, promise;

	let mongo = env.databases.mongo;

	let associationId = req.cookies[req.query.service + '_assoc'];
	let type = req.query.type;

	if (!associationId || (type !== 'signup' && type !== 'login' && type !== 'link')) {
		next(httpErrors(404));
	}
	else if (!req.user && type === 'link') {
		next(httpErrors(404));
	}
	else {
		$filter = {
			token: gid(associationId),
			connection_id: gid(req.query.connection_id)
		};

		promise = mongo.db('live').collection('association_sessions').count($filter)
			.then(function(n) {
				if (n === 0) {
					return Promise.reject(new AssociationError('Invalid association session or association session timeout.'));
				}

				return Promise.all([
					mongo.db('live').collection('association_sessions').remove($filter),

					bitscoop.getConnection(req.query.existing_connection_id || req.query.connection_id)
				])
					.then(function(resolution) {
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

		if (type === 'login') {
			promise = promise
				.then(function(connection) {
					return mongo.db('live').collection('users').findOne({
						social_accounts: gid(connection.id)
					});
				});
		}
		else if (type === 'signup' || type === 'link') {
			promise = promise
				.then(function(connection) {
					return mongo.db('live').collection('users').count({
						social_accounts: gid(connection.id)
					})
						.then(function(n) {
							if (n > 0) {
								return Promise.reject(new AssociationError('It looks like you\'ve already associated this account with BitScoop. Try logging in with it instead.'));
							}

							return Promise.resolve(connection);
						});
				});

			if (type === 'link') {
				promise = promise
					.then(function(connection) {
						return mongo.db('live').collection('users').update({
							_id: req.user._id
						}, {
							$push: {
								social_accounts: gid(connection.id)
							}
						});
					})
					.then(function() {
						return Promise.resolve(req.user);
					});
			}
			else if (type === 'signup') {
				promise = promise
					.then(function(connection) {
						return mongo.db('live').collection('users').count({
							social_accounts: gid(connection.id)
						})
							.then(function(n) {
								if (n > 0) {
									return Promise.reject(new AssociationError('It looks like you\'ve already associated this account with BitScoop. Try logging in with it instead.'));
								}

								return Promise.resolve(connection);
							});
					})
					.then(function(connection) {
						let email, promise;

						let user = {
							_id: gid(),
							social_accounts: [gid(connection.id)],
							joined: moment.utc().toDate(),
							subscriptions: [gid()]
						};

						if (req.query.service === 'github') {
							if (connection.metadata.email) {
								email = connection.metadata.email;
							}

							if (connection.metadata.name) {
								let name = human.parseName(connection.metadata.name);

								if (name.firstName) {
									user.first_name = name.firstName;
								}

								if (name.lastName) {
									user.last_name = name.lastName;
								}
							}
						}
						else if (req.query.service === 'google') {
							if (connection.metadata.emails.length > 0) {
								email = connection.metadata.emails[0].address;
							}

							if (connection.metadata.names.length > 0) {
								let name = connection.metadata.names[0];

								if (name) {
									if (name.first_name) {
										user.first_name = name.first_name;
									}

									if (name.last_name) {
										user.last_name = name.last_name;
									}
								}
							}
						}

						if (email) {
							promise = mongo.db('live').collection('users').count({
								_upper_email: email.toUpperCase()
							});
						}
						else {
							promise = Promise.resolve(0);
						}

						return promise
							.then(function(n) {
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
							.then(function() {
								return Promise.resolve(user);
							});
					});
			}
		}

		if (type === 'signup' || type === 'login') {
			promise = promise
				.then(function(user) {
					if (!user) {
						return Promise.reject(httpErrors(404));
					}

					return Promise.all([
						sessions.create(req, user, {
							persist: true
						}),

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
				.then(function(resolution) {
					let [session] = resolution;

					res.cookie(config.sessions.cookieName, session.token, {
						domain: config.domain,
						//secure: true,
						httpOnly: true,
						expires: 0
					});
				});
		}

		promise
			.then(function() {
				res.redirect('/');
			})
			.catch(function(err) {
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
			.catch(function(err) {
				next(err);
			});
	}
});


module.exports = router;
