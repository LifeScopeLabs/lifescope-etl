'use strict';

const url = require('url');

const Promise = require('bluebird');
const _ = require('lodash');
const config = require('config');
const express = require('express');
const httpErrors = require('http-errors');

const csrf = require('../../middleware/csrf');
const get = require('./templates/get');
const gid = require('../../util/gid');
const loginRequired = require('../../middleware/login-required');
const models = require('../../models');
const orderedMap = require('../../util/ordered-map');
const tag = require('./templates/tag');


let router = express.Router();
let event = router.route('/:id');
let tagging = router.route('/:id/tag');
let events = router.route('/');

let textFields = [
	'contacts.handle',
	'contacts.name',
	'content.type',
	'content.file_extension',
	'content.owner',
	'content.text',
	'content.title',
	'content.url',
	'things.title',
	'things.text',
	'type',
	'provider_name'
];

let specialSorts = {
	connection: {
		condition: 'connection',
		values: {
			provider_name: -1,
			connection: -1
		}
	},
	rawType: {
		condition: 'type',
		values: {
			type: -1,
			context: -1
		}
	},
	emptyQueryRelevance: {
		values: {
			datetime: -1
		}
	}
};

let $lookup = {
	$lookup: {
		from: 'content',
		localField: 'content',
		foreignField: '_id',
		as: 'providers'
	}
};

let $project = {
	$project: {
		_id: false
	}
};


event.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

/**
 * Gets the event with the given ID. If a event with that ID does not exist, then it throws an error.
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
event.get(loginRequired(404), function(req, res, next) {
	get.one(req, 'events', models.Event)
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});


events.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS,SEARCH');

	res.sendStatus(204);
});

/**
 * Retrieves a list of events for the current user. Pagination is handled via limit and offset.
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
events.get(loginRequired(404), function(req, res, next) {
	get.many(req, 'events', models.Event)
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});

/**
 * Searches for a list of events via an optional query and filters. Data is returned sorted via an optional sort field
 * and order. Pagination is handled via limit and offset parameters.
 *
 * @param {Object} [filters] Filters in DSL format.
 * @param {Number} limit Page limit for the results.
 * @param {Number} offset Offset from the first result.
 * @param {String} [query] Query text to search for.
 * @param {String} [sortField] Field on which to sort results.
 * @param {String} [sortOrder] Order in which to sort results.
 * @returns {Object} An object containing the search results along with attendant information about the search.
 *      @returns {Number} count The total number of results for this search.
 *      @returns {String} limit Page limit for the results
 *      @returns {String} next The URL to call for the next page of results, or null if there are no more results.
 *      @returns {String} offset The offset from the first result.
 *      @returns {String} prev The URL to call for the previous page of results, or null if there are no more results.
 *      @returns {Array} results The current page of results.
 */
events.search(loginRequired(404), function(req, res, next) {
	let validationVal;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	let filters = req.body.filters;
	let suppliedFilters = filters;

	let query = {
		filters: filters,
		limit: req.query.limit || req.body.limit,
		offset: req.query.offset || req.body.offset,
		q: req.query.q || req.body.q,
		sortField: req.query.sortField || req.body.sortField,
		sortOrder: req.query.sortOrder || req.body.sortOrder
	};

	let suppliedSortField = query.sortField;
	let suppliedSortOrder = query.sortOrder;

	let validation = Promise.all([
		validate('#/requests/search', query),
		//validate('#/searchdsl/types/event', query.filters),
		//validate('#/searchdsl/sorts/event', query.sortField)
	])
		.then(function(result) {
			let [query, filters, sortField] = result;

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
			let sort;

			validationVal = query;

			let specialSort = false;

			for (let key in specialSorts) {
				if (!specialSorts.hasOwnProperty(key)) {
					break;
				}

				let field = specialSorts[key];

				if ((key === 'emptyQueryRelevance' && query.sortField === '_score' && query.q == null) || query.sortField === field.condition) {
					specialSort = true;
					sort = field.values;
				}
			}

			if (specialSort === false) {
				sort = {
					[query.sortField]: query.sortOrder === 'asc' ? 1 : -1
				}
			}

			let promise = Promise.resolve();

			if (query.q != null || (query.filters != null && Object.keys(query.filters).length > 0)) {
				let contactOptions = {};
				let contentOptions = {};
				let eventOptions = {};

				if (query.filters.hasOwnProperty('whoFilters') && query.filters.whoFilters.length > 0) {
					if (!contactOptions.hasOwnProperty('$and')) {
						contactOptions.$and = [];
					}

					contactOptions.$and.push({
						$or: query.filters.whoFilters
					});
				}

				if (query.filters.hasOwnProperty('whatFilters') && query.filters.whatFilters.length > 0) {
					if (!contentOptions.hasOwnProperty('$and')) {
						contentOptions.$and = [];
					}

					contentOptions.$and.push({
						$or: query.filters.whatFilters
					});
				}

				if (query.filters.hasOwnProperty('whenFilters') && query.filters.whenFilters.length > 0) {
					if (!eventOptions.hasOwnProperty('$and')) {
						eventOptions.$and = [];
					}

					_.each(query.filters.whenFilters, function(filter) {
						if (filter.datetime.$gte) {
							filter.datetime.$gte = new Date(filter.datetime.$gte);
						}

						if (filter.datetime.$lte) {
							filter.datetime.$lte = new Date(filter.datetime.$lte);
						}
					});

					eventOptions.$and.push({
						$or: query.filters.whenFilters
					});
				}

				if (query.filters.hasOwnProperty('whereFilters') && query.filters.whereFilters.length > 0) {
					if (!eventOptions.hasOwnProperty('$and')) {
						eventOptions.$and = [];
					}

					eventOptions.$and.push({
						$or: query.filters.whereFilters
					});
				}

				if (query.filters.hasOwnProperty('connectorFilters') && query.filters.connectorFilters.length > 0) {
					if (!eventOptions.hasOwnProperty('$and')) {
						eventOptions.$and = [];
					}

					eventOptions.$and.push({
						$or: query.filters.connectorFilters
					});
				}

				if (query.filters.hasOwnProperty('tagFilters') && query.filters.tagFilters.length > 0) {
					if (!contactOptions.hasOwnProperty('$and')) {
						contactOptions.$and = [];
					}

					if (!contentOptions.hasOwnProperty('$and')) {
						contentOptions.$and = [];
					}

					if (!eventOptions.hasOwnProperty('$and')) {
						eventOptions.$and = [];
					}

					contactOptions.$and.push({
						$or: [{
							$or: [{
								$and: [{
									'tagMasks.source': {
										$in: query.filters.tagFilters
									},

									'tagMasks.removed': {
										$nin: query.filters.tagFilters
									}
								}]
							}, {
								$and: [{
									'tagMasks.added': {
										$in: query.filters.tagFilters
									},

									'tagMasks.removed': {
										$nin: query.filters.tagFilters
									}
								}]
							}]
						}]
					});

					contentOptions.$and.push({
						$or: [{
							$or: [{
								$and: [{
									'tagMasks.source': {
										$in: query.filters.tagFilters
									},

									'tagMasks.removed': {
										$nin: query.filters.tagFilters
									}
								}]
							}, {
								$and: [{
									'tagMasks.added': {
										$in: query.filters.tagFilters
									},

									'tagMasks.removed': {
										$nin: query.filters.tagFilters
									}
								}]
							}]
						}]
					});

					eventOptions.$and.push({
						$or: [{
							$or: [{
								$and: [{
									'tagMasks.source': {
										$in: query.filters.tagFilters
									},

									'tagMasks.removed': {
										$nin: query.filters.tagFilters
									}
								}]
							}, {
								$and: [{
									'tagMasks.added': {
										$in: query.filters.tagFilters
									},

									'tagMasks.removed': {
										$nin: query.filters.tagFilters
									}
								}]
							}]
						}]
					});
				}

				if (query.q != null) {
					contactOptions.$text = {
						$search: query.q
					};

					contentOptions.$text = {
						$search: query.q
					};

					eventOptions.$text = {
						$search: query.q
					};
				}
				if (Object.keys(contactOptions).length === 0) {
					contactOptions.intentionallyFail = true;
				}

				if (Object.keys(contentOptions).length === 0) {
					contentOptions.intentionallyFail = true;
				}

				if (Object.keys(eventOptions).length === 0) {
					eventOptions.intentionallyFail = true;
				}

				promise = promise.then(function() {
					return Promise.all([
						mongo.db('live').collection('contacts').find(contactOptions).toArray(),

						mongo.db('live').collection('content').find(contentOptions).toArray(),

						mongo.db('live').collection('events').find(eventOptions).toArray()
					])
						.then(function(results) {
							let [contactResults, contentResults, eventResults] = results;

							let contactIds = _.map(contactResults, function(result) {
								return result._id;
							});

							let contentIds = _.map(contentResults, function(result) {
								return result._id;
							});

							let eventIds = _.map(eventResults, function(result) {
								return result._id;
							});
							return mongo.db('live').collection('events').find({
								user_id: req.user._id,
								$or: [
									{
										_id: {
											$in: eventIds
										}
									},
									{
										contacts: {
											$in: contactIds
										}
									},
									{
										content: {
											$in: contentIds
										}
									}
								]
							})
								.sort(sort)
								.toArray()
						});
				});
			}
			else {
				promise = promise.then(function() {
					return mongo.db('live').collection('events').find({
						user_id: req.user._id
					})
						.sort(sort)
						.toArray();
				});
			}

			return promise
				.then(function(documents) {
					let idMap = {};

					let count = documents.length;
					let hexIds = new Array(documents.length);
					let binIds = new Array(documents.length);

					for (let i = 0; i < documents.length; i++) {
						let document = documents[i];

						let binId = document._id;

						hexIds[i] = binId.toString('hex');
						binIds[i] = binId;

						let object = new models.Event(document);
						idMap[object.id] = object;
					}

					let results = _.map(hexIds, function(id) {
						return idMap[id];
					});

					let promises = _.map(results, function(event) {
						let contacts, content, location;

						if (event.contacts && event.contacts.length > 0) {
							contacts = mongo.db('live').collection('contacts').find({
								_id: {
									$in: event.contacts
								}
							}).toArray()
								.then(function(results) {
									event.contacts = orderedMap(event.contacts, results, models.Contact.create);

									return Promise.resolve(null);
								});
						}
						else {
							contacts = Promise.resolve();
						}

						if (event.content && event.content.length > 0) {
							content = mongo.db('live').collection('content').find({
								_id: {
									$in: event.content
								}
							}).toArray()
								.then(function(results) {
									event.content = orderedMap(event.content, results, models.Content.create);

									return Promise.resolve(null);
								});
						}
						else {
							content = Promise.resolve();
						}

						if (event.location) {
							location = mongo.db('live').collection('locations').findOne({
								_id: event.location
							})
								.then(function(result) {
									event.location = new models.Content.create(result);

									return Promise.resolve(null);
								});
						}
						else {
							location = Promise.resolve();
						}

						//if (event.things && event.things.length > 0) {
						//	things = mongo.db('live').collection('thing').find({
						//		_id: {
						//			$in: event.things
						//		}
						//	}).toArray()
						//		.then(function(results) {
						//			event.things = orderedMap(event.things, results, models.Thing.create);
						//
						//			return Promise.resolve(null);
						//		});
						//}
						//else {
						//	things = Promise.resolve();
						//}

						return Promise.all([contacts, content, location/*, things*/]);
					});

					return Promise.all(promises).then(function() {
						return Promise.resolve([results, count]);
					});
				});
		})
		.then(function(result) {
			let [results, count] = result;

			let query = validationVal;
			let q = query.q;
			let sortField = query.sortField;
			let sortOrder = query.sortOrder;
			let limit = query.limit;
			let offset = query.offset;
			let prev = null;
			let next = null;

			if (offset !== 0) {
				prev = {
					url: url.format({
						protocol: 'https',
						hostname: 'app.lifescope.io',
						pathname: 'api/events'
					}),
					method: 'SEARCH',
					body: {
						limit: limit,
						offset: Math.max(0, offset - limit),
						q: q,
						filters: suppliedFilters,
						sortField: sortField,
						sortOrder: sortOrder
					}
				};
			}

			if (limit + offset < count) {
				next = {
					url: url.format({
                        protocol: 'https',
                        hostname: 'app.lifescope.io',
						pathname: 'api/events'
					}),
					method: 'SEARCH',
					body: {
						limit: limit,
						offset: offset + limit,
						q: q,
						filters: suppliedFilters,
						sortField: suppliedSortField,
						sortOrder: suppliedSortOrder
					}
				};
			}

			return Promise.resolve({
				count: count,
				limit: limit,
				offset: offset,
				sortField: sortField,
				sortOrder: sortOrder,
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


tagging.options(function(req, res, next) {
	res.setHeader('Allowed', 'DELETE,OPTIONS,POST');

	res.sendStatus(204);
});

tagging.delete(loginRequired(404), csrf.validate, function(req, res, next) {
	tag.remove(req, 'events')
		.then(function() {
			res.sendStatus(204);
		})
		.catch(function(err) {
			next(err);
		});
});

tagging.post(loginRequired(404), csrf.validate, function(req, res, next) {
	tag.add(req, 'events')
		.then(function() {
			res.sendStatus(204);
		})
		.catch(function(err) {
			next(err);
		});
});


module.exports = router;
