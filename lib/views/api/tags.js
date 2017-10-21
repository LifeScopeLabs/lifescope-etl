'use strict';

const url = require('url');

const Promise = require('bluebird');
const _ = require('lodash');
const config = require('config');
const express = require('express');
const httpErrors = require('http-errors');

const models = require('../..//models');
const loginRequired = require('../../middleware/login-required');


let router = express.Router();
let tags = router.route('/');


tags.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

/**
 * Retrieves a list of tags for the current user. Pagination is handled via limit and offset.
 *
 * @param {Number} limit Page limit for the results.
 * @param {Number} offset Offset from the first result.
 * @returns {Object} An object containing the search results along with attendant information about the search.
 *      @returns {Number} count The total number of results for this search.
 *      @returns {String} limit Page limit for the results
 *      @returns {String} next The URL to call for the next page of results, or null if there are no more results.
 *      @returns {String} offset The offset from the first result.
 *      @returns {String} prev The URL to call for the previous page of results, or null if there are no more results.
 *      @returns {Array} results The current page of results.
 */
tags.get(loginRequired(404), function(req, res, next) {
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

			let count = mongo.db('live').collection('tags').count(filter);
			let result = mongo.db('live').collection('tags').find(filter, {
				limit: query.limit,
				skip: query.offset,
				sort: {
					tag: 1
				}
			}).toArray();

			return Promise.all([result, count]);
		})
		.then(function(result) {
			let [data, count] = result;

			let create = models.UserTag.create;

			if (typeof create !== 'function') {
				create = function(data) {
					return new models.UserTag(data);
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
					hostname: 'lifescope.io',
					pathname: 'api/tags',
					query: {
						limit: limit,
						offset: Math.max(0, offset - limit)
					}
				});
			}

			if (limit + offset < count) {
				next = url.format({
					protocol: 'https',
					hostname: 'lifescope.io',
					pathname: 'api/tags',
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
		})
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});


module.exports = router;
