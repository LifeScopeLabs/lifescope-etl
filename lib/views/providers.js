'use strict';

const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const config = require('config');
const express = require('express');

const router = express.Router();
const providers = router.route('/');

const loginRequired = require('../middleware/login-required');


let bitscoop = new BitScoop(config.api.key, {
	allowUnauthorized: true
});


providers.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

providers.get(loginRequired(404), function(req, res, next) {
	res.context.page_name = 'providers';

	let mongo = env.databases.mongo;

	let mergedProviders = mongo.db('live').collection('providers').find({}).toArray()
		.then(function(results) {
			let promises = _.map(results, function(provider) {
				return bitscoop.getMap(provider.remote_map_id.toString('hex'))
					.then(function(remoteProvider) {
						let merged = _.assign(provider, remoteProvider);

						return Promise.resolve(merged);
					});
			});

			return Promise.all(promises);
		});

	let mergedConnections = mongo.db('live').collection('connections').find({
		user_id: req.user._id
	}).toArray()
		.then(function(results) {
			let promises = _.map(results, function(connection) {
				return bitscoop.getConnection(connection.remote_connection_id.toString('hex'))
					.then(function(remoteConnection) {
						let merged = _.assign(remoteConnection, connection);

						return Promise.resolve(merged);
					})
					.catch(function(err) {
						return Promise.resolve(connection);
					});
			});

			return Promise.all(promises);
		});

	Promise.all([
		mergedProviders,
		mergedConnections
	])
		.then(function(result) {
			let [providers, connections] = result;

			_.forEach(providers, function(provider) {
				provider.assoc_count = 0;

				_.forEach(connections, function(connection) {
					if (provider._id.toString('hex') === connection.provider_id.toString('hex') && connection.auth.status.complete === true) {
						provider.assoc_count += 1;
					}
				});
			});

			return Promise.resolve(providers);
		})
		.then(function(providers) {
			res.render('providers.html', {
				title: 'Providers',
				providers: providers,
				mode: 'provider'
			});
		})
		.catch(function(err) {
			next(err);
		});
});


module.exports = router;
