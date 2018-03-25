'use strict';

const crypto = require('crypto');
const url = require('url');

const Promise = require('bluebird');
const _ = require('lodash');
const config = require('config');
const express = require('express');
const httpErrors = require('http-errors');
const moment = require('moment');

const csrf = require('../../middleware/csrf');
const get = require('./templates/get');
const gid = require('../../util/gid');
const loginRequired = require('../../middleware/login-required');
const models = require('../../models');
const sortDictionary = require('../../util/sort-dictionary');


let router = express.Router();
let search = router.route('/:id');
let searches = router.route('/');


search.options(function(req, res, next) {
	res.setHeader('Allowed', 'DELETE,GET,OPTIONS,PATCH');

	res.sendStatus(204);
});

/**
 * Deletes an existing search. Returns a 204 if successful, throws an error if not or no search with that ID exists.
 *
 * @param {String} id The ID of the saved search.
 * @returns {Number} A status code indicating success (204) or failure (404).
 */
search.delete(loginRequired(404), csrf.validate, function(req, res, next) {
	let hexId = req.params.id;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			return mongo.db('live').collection('searches').deleteOne({
				_id: gid(hexId),
				user_id: req.user._id
			});
		})
		.then(function(data) {
			if (data.result.n === 0) {
				return Promise.reject(httpErrors(404));
			}

			return Promise.resolve();
		})
		.then(function() {
			res.sendStatus(204);
		})
		.catch(function(err) {
			next(err);
		});
});

/**
 * Gets the saved search with the given ID. If that ID does not exist, then it throws an error.
 *
 * @param {Boolean} id The ID of the saved search.
 * @returns {Object} An object containing the matching search and its attendant information. If no match, then an error
 *      is thrown.
 *      @returns {String} id The ID of the matching saved search.
 *      @returns {String} [name] The name of the matching saved search.
 *      @returns {String} [icon] The icon of the matching saved search.
 *      @returns {String} [iconColor] The icon color of the matching saved search.
 *      @returns {String} [query] The query of the matching saved search.
 *      @returns {String} filters The filters of the matching saved search.
 *      @returns {String} [favorited] The favorited status of the matching saved search.
 */
search.get(loginRequired(404), function(req, res, next) {
	return get.one(req, 'searches', models.Search)
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});

/**
 * Updates an existing saved search's favorite-related information. Returns the ID of the search if successful, throws
 * an error if not or no search with that ID exists.
 *
 * @param {String} id The ID of the saved search.
 * @param {Boolean} [favorited] Whether or not the search has been favorited.
 * @param {String} [icon] The icon associated with this search.
 * @param {String} [iconColor] The icon color associated with this search.
 * @param {String} [name] The name associated with this search.
 * @returns {Object} An object containing the ID of the matching search.
 *      @returns {String} id The ID of saved search that has just been updated.
 */
search.patch(loginRequired(404), csrf.validate, function(req, res, next) {
	let hexId = req.params.id;
	let body = req.body;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			return validate('#/objects/search', body);
		})
		.catch(function() {
			return Promise.reject(httpErrors(400));
		})
		.then(function() {
			let filter = {
				_id: gid(hexId),
				user_id: req.user._id
			};

			_.assign(body, {
				last_run: moment.utc().toDate()
			});

			return mongo.db('live').collection('searches').updateOne(filter, {
				$set: body
			})
				.then(function(data) {
					if (data.result.n === 0) {
						return Promise.reject(httpErrors(404));
					}

					return mongo.db('live').collection('searches').findOne(filter);
				});
		})
		.then(function(document) {
			let response = new models.Search(document);

			return Promise.resolve(response);
		})
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});


searches.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS,POST,SEARCH');

	res.sendStatus(204);
});

/**
 * Searches for a list of saved searches and is potentially filtered. Data is returned sorted via type. Pagination is
 * handled via limit and offset.
 *
 * @param {Number} limit Page limit for the results.
 * @param {Number} offset Offset from the first result.
 * @param {String} type How the results are filtered and sorted.
 * @returns {Object} An object containing the search results along with attendant information about the search.
 *      @returns {Number} count The total number of results for this search.
 *      @returns {String} limit Page limit for the results
 *      @returns {String} next The URL to call for the next page of results, or null if there are no more results.
 *      @returns {String} offset The offset from the first result.
 *      @returns {String} prev The URL to call for the previous page of results, or null if there are no more results.
 *      @returns {Array} results The current page of results.
 */
searches.get(loginRequired(404), function(req, res, next) {
	let queryVal;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	let type = req.query.type;
	let pagination = {
		limit: req.query.limit,
		offset: req.query.offset
	};

	let validation = validate('#/requests/get', pagination)
		.then(function(pagination) {
			if (pagination.limit > config.objectMaxLimit) {
				pagination.limit = config.objectMaxLimit;
			}

			return Promise.resolve(pagination);
		})
		.catch(function(err) {
			// TODO: Improve error report for bad validation.

			return Promise.reject(httpErrors(400));
		});

	return validation
		.then(function(pagination) {
			queryVal = pagination;
			let sort = {};
			let filter = {
				user_id: req.user._id
			};

			if (type === 'favorites') {
				filter.favorited = true;
				sort = {
					name: 1,
					last_run: -1
				};
			}
			else if (type === 'recent') {
				sort = {
					last_run: -1
				};
			}
			else if (type === 'top') {
				sort = {
					count: -1
				};
			}

			let count = mongo.db('live').collection('searches').count(filter);
			let result = mongo.db('live').collection('searches').find(filter, {
				limit: pagination.limit,
				skip: pagination.offset,
				sort: sort
			}).toArray();

			return Promise.all([result, count]);
		})
		.then(function(result) {
			let [data, count] = result;

			let create = models.Search.create;

			if (typeof create !== 'function') {
				create = function(data) {
					return new models.Search(data);
				};
			}

			let results = _.map(data, create);
			let pagination = queryVal;
			let limit = pagination.limit;
			let offset = pagination.offset;
			let prev = null;
			let next = null;

			if (offset !== 0) {
				prev = url.format({
					protocol: 'https',
					hostname: 'app.lifescope.io',
					pathname: 'api/searches',
					query: {
						limit: limit,
						offset: Math.max(0, offset - limit),
						type: type
					}
				});
			}

			if (limit + offset < count) {
				next = url.format({
					protocol: 'https',
					hostname: 'app.lifescope.io',
					pathname: 'api/searches',
					query: {
						limit: limit,
						offset: offset + limit,
						type: type
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
		})
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});

/**
 * Creates a new saved search or updates an existing saved search.
 *
 * @param {Boolean} [favorited] Whether or not the search has been favorited.
 * @param {Object} [filters] Filters for the search (not in DSL format).
 * @param {String} [icon] The icon associated with this search.
 * @param {String} [iconColor] The icon color associated with this search.
 * @param {String} [query] Query text for the search.
 * @param {String} [name] The name associated with this search.
 * @returns {Object} An object containing the ID of the matching search.
 *      @returns {String} id The ID of saved search that has just been created or updated.
 */
searches.post(loginRequired(404), csrf.validate, function(req, res, next) {
	let body = req.body;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/objects/search', body)
		.catch(function() {
			return Promise.reject(httpErrors(400));
		})
		.then(function() {
			if (!body.filters) {
				body.filters = [];
			}

			let unnamedFilters = new Array(body.filters.length);

			_.map(body.filters, function(filter, i) {
				unnamedFilters[i] = _.omit(filter, 'name');
			});

			let hashObj = {
				filters: unnamedFilters
			};

			if (body.query != null) {
				hashObj.query = body.query;
			}

			let sorted = sortDictionary(hashObj);
			let hash = crypto.createHash('sha512').update(sorted).digest('hex');

			return mongo.db('live').collection('searches').update({
				hash: hash,
				user_id: req.user._id
			}, {
				$set: {
					filters: body.filters,
					last_run: moment.utc().toDate()
				},
				$inc: {
					count: 1
				},
				$setOnInsert: {
					_id: gid(),
					hash: hash,
					user_id: req.user._id,
					favorited: req.body.favorited,
					icon: req.body.icon,
					icon_color: req.body.icon_color,
					query: req.body.query,
					name: req.body.name
				}
			}, {
				upsert: true
			})
				.then(function() {
					return mongo.db('live').collection('searches').findOne({
						hash: hash
					});
				});
		})
		.then(function(document) {
			let response = new models.Search(document);

			return Promise.resolve(response);
		})
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});

/**
 * Checks if a given search (filters and query) has already been saved. If so, returns the ID of that search, otherwise
 * returns a 204.
 *
 * @param {Object} [filters] Filters in DSL format.
 * @param {String} [query] Query text to search for.
 * @returns {Object} An object containing the matching search and its attendant information. If no match, then a 204
 *     response is returned with no object.
 *      @returns {String} id The ID of the matching saved search.
 *      @returns {String} [name] The name of the matching saved search.
 *      @returns {String} [icon] The icon of the matching saved search.
 *      @returns {String} [iconColor] The icon color of the matching saved search.
 *      @returns {String} [query] The query of the matching saved search.
 *      @returns {String} filters The filters of the matching saved search.
 *      @returns {String} [favorited] The favorited status of the matching saved search.
 */
searches.search(loginRequired(404), function(req, res, next) {
	let body = req.body;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/objects/search', body)
		.catch(function() {
			return Promise.reject(httpErrors(400));
		})
		.then(function() {
			let unnamedFilters = new Array(body.filters.length);

			for (let i = 0; i < body.filters.length; i++) {
				unnamedFilters[i] = _.omit(body.filters[i], 'name');
			}

			let hashObj = {
				filters: unnamedFilters
			};

			if (body.query != null) {
				hashObj.query = body.query;
			}

			let sorted = sortDictionary(hashObj);
			let hash = crypto.createHash('sha512').update(sorted).digest('hex');

			return mongo.db('live').collection('searches').findOne({
				hash: hash
			});
		})
		.then(function(document) {
			let response = document ? new models.Search(document) : null;

			return Promise.resolve(response);
		})
		.then(function(response) {
			if (response) {
				res.json(response);
			}
			else {
				res.sendStatus(204);
			}
		})
		.catch(function(err) {
			next(err);
		});
});


module.exports = router;
