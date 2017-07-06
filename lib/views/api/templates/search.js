'use strict';

const url = require('url');

const Promise = require('bluebird');
const _ = require('lodash');
const config = require('config');
const httpErrors = require('http-errors');

const gid = require('../../../util/gid');


function search(req, type, Constructor, typeFilter, typeSort, textFields, specialSorts) {
	let validationVal;
	let elastic = env.databases.elastic;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	let filters = req.body.filters;
	let suppliedFilters = filters;

	if (filters == null) {
		filters = {
			bool: {
				must: [],
				must_not: [],
				should: []
			}
		};
	}

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
		validate(typeFilter, query.filters),
		validate(typeSort, query.sortField)
	])
		.then(function(result) {
			let [query, filters, sortField] = result;

			if (query.limit > config.objectMaxLimit) {
				query.limit = config.objectMaxLimit;
			}

			switch(query.sortOrder) {
				case '+':
					query.sortOrder = 1;
					break;

				case '-':
					query.sortOrder = -1;
					break;
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
			let esQuery = {
				query: {
					bool: {
						filter: {
							and: [
								query.filters,
								{
									bool: {
										must: {
											term: {
												user_id: req.user._id.toString('hex')
											}
										}
									}
								}
							]
						}
					}
				},
				size: query.limit,
				from: query.offset
			};

			let specialSort = false;

			for (let key in specialSorts) {
				if (!specialSorts.hasOwnProperty(key)) {
					break;
				}

				let field = specialSorts[key];

				if ((key === 'emptyQueryRelevance' && query.sortField === '_score' && query.q == null) || query.sortField === field.condition) {
					specialSort = true;
					esQuery.sort = new Array(field.values.length);

					for (let i = 0; i < field.values.length; i++) {
						let value = field.values[i];

						esQuery.sort[i] = {
							[value]: {
								order: query.sortOrder
							}
						};
					}
				}
			}

			if (specialSort === false) {
				esQuery.sort = [
					{
						[query.sortField]: {
							order: query.sortOrder
						}
					}
				];
			}

			if (query.q != null) {
				esQuery.query.bool.must = {
					multi_match: {
						query: query.q,
						type: 'most_fields',
						fields: textFields
					}
				};
			}

		//	return elastic.search({
		//		index: 'explorer',
		//		type: type,
		//		body: esQuery
		//	});
		//})
		//.then(function(data) {
		//	let count = data.hits.total;
		//	let results = data.hits.hits;
		//
		//	let hexIds = new Array(results.length);
		//	let binIds = new Array(results.length);
		//
		//	for (let i = 0; i < results.length; i++) {
		//		let hexId = results[i]._id;
		//
		//		hexIds[i] = hexId;
		//		binIds[i] = gid(hexId);
		//	}

			return mongo.db('live').collection(type).find({
				//_id: {
				//	$in: binIds
				//},
				user_id: req.user._id
			}).toArray()
				.then(function(documents) {
					let idMap = {};

					for (let i = 0; i < documents.length; i++) {
						let document = documents[i];
						let object = new Constructor(document);

						idMap[object.id] = object;
					}

					let results = _.map(hexIds, function(id) {
						return idMap[id];
					});

					return Promise.resolve([results, count]);
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
						hostname: 'live.bitscoop.com',
						pathname: 'api/' + type
					}),
					method: 'SEARCH',
					body: {
						limit: limit,
						offset: Math.max(0, offset - limit),
						q: q,
						filters: suppliedFilters,
						sortField: suppliedSortField,
						sortOrder: suppliedSortOrder
					}
				};
			}

			if (limit + offset < count) {
				next = {
					url: url.format({
						protocol: 'https',
						hostname: 'live.bitscoop.com',
						pathname: 'api/' + type
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
		});
}


module.exports = search;
