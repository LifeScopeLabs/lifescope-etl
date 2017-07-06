'use strict';

const url = require('url');

const Promise = require('bluebird');
const _ = require('lodash');
const config = require('config');
const httpErrors = require('http-errors');

const gid = require('../../../util/gid');


function many(req, type, Constructor) {
	let validationVal;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	let query = {
		limit: req.query.limit,
		offset: req.query.offset
	};

	let validation = validate('#/requests/get', query)
		.then(function(query) {
			if (query.limit > config.objectMaxLimit) {
				query.limit = config.objectMaxLimit;
			}

			return Promise.resolve(query);
		})
		.catch(function(err) {
			// TODO: Improve error report for bad validation.

			return Promise.reject(httpErrors(400));
		});

	return validation
		.then(function(query) {
			validationVal = query;
			let filter = {
				user_id: req.user._id
			};

			let count = mongo.db('live').collection(type).count(filter);
			let result = mongo.db('live').collection(type).find(filter, {
				limit: query.limit,
				skip: query.offset
			}).toArray();

			return Promise.all([result, count]);
		})
		.then(function(result) {
			let [data, count] = result;

			let create = Constructor.create;

			if (typeof create !== 'function') {
				create = function(data) {
					return new Constructor(data);
				};
			}

			let results = _.map(data, create);
			let query = validationVal;
			let limit = query.limit;
			let offset = query.offset;
			let prev = null;
			let next = null;

			if (offset !== 0) {
				prev = url.format({
					protocol: 'https',
					hostname: 'live.bitscoop.com',
					pathname: 'api/' + type,
					query: {
						limit: limit,
						offset: Math.max(0, offset - limit)
					}
				});
			}

			if (limit + offset < count) {
				next = url.format({
					protocol: 'https',
					hostname: 'live.bitscoop.com',
					pathname: 'api/' + type,
					query: {
						limit: limit,
						offset: offset + limit
					}
				});
			}

			return Promise.resolve({
				count: count,
				limit: limit,
				offset: offset,
				prev: prev,
				next: next,
				results: results
			});
		});
}

function one(req, type, Constructor) {
	let hexId = req.params.id;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			return mongo.db('live').collection(type).findOne({
				_id: gid(hexId),
				user_id: req.user._id
			});
		})
		.then(function(document) {
			if (!document) {
				return Promise.reject(httpErrors(404));
			}

			let response = new Constructor(document);

			return Promise.resolve(response);
		});
}


module.exports = {
	many: many,
	one: one
};
