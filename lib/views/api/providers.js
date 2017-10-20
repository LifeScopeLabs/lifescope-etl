'use strict';

const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const config = require('config');
const express = require('express');
const httpErrors = require('http-errors');

const gid = require('../../util/gid');
const loginRequired = require('../../middleware/login-required');
const models = require('../../models');


let router = express.Router();
let provider = router.route('/:id');
let providers = router.route('/');

let bitscoop = new BitScoop(config.api.key, {
	allowUnauthorized: true
});


provider.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

provider.get(loginRequired(404), function(req, res, next) {
	let hexId = req.params.id;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			return mongo.db('live').collection('providers').findOne({
				_id: gid(hexId)
			});
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
		})
		.then(function(document) {
			if (document == null) {
				return Promise.reject(httpErrors(404));
			}

			let response = new models.Provider(document);

			return Promise.resolve(response);
		})
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});


providers.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

providers.get(loginRequired(404), function(req, res, next) {
	let mongo = env.databases.mongo;

	return mongo.db('live').collection('providers').find({}).toArray()
		.then(function(results) {
			let promises = _.map(results, function(provider) {
				return bitscoop.getMap(provider.remote_map_id.toString('hex'))
					.then(function(remoteProvider) {
						let merged = _.assign(provider, remoteProvider);

						return Promise.resolve(merged);
					});
			});

			return Promise.all(promises);
		})
		.then(function(documents) {
			let response = _.map(documents, models.Provider.create);

			return Promise.resolve(response);
		})
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});


module.exports = router;
