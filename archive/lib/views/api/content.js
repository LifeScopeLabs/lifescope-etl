'use strict';

const express = require('express');

const csrf = require('../../middleware/csrf');
const get = require('./templates/get');
const loginRequired = require('../../middleware/login-required');
const models = require('../../models');
const search = require('./templates/search');
const tag = require('./templates/tag');


let router = express.Router();
let content = router.route('/:id');
let tagging = router.route('/:id/tag');
let contents = router.route('/');

let textFields = [
	'type',
	'file_extension',
	'owner',
	'text',
	'title'
];

let specialSorts = {
	emptyQueryRelevance: {
		values: [
			'type.raw'
		]
	}
};


content.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

/**
 * Gets the content with the given ID. If a content with that ID does not exist, then it throws an error.
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
content.get(loginRequired(404), function(req, res, next) {
	get.one(req, 'content', models.Content)
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});


contents.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS,SEARCH');

	res.sendStatus(204);
});

/**
 * Retrieves a list of contents for the current user. Pagination is handled via limit and offset.
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
contents.get(loginRequired(404), function(req, res, next) {
	get.many(req, 'content', models.Content)
		.then(function(response) {
			res.json(response);
		})
		.catch(function(err) {
			next(err);
		});
});

/**
 * Searches for a list of contents via an optional query and filters. Data is returned sorted via an optional sort
 * field and order. Pagination is handled via limit and offset parameters.
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
contents.search(loginRequired(404), function(req, res, next) {
	search(req, 'content', models.Content, '/searchdsl/types/content', '/searchdsl/sorts/content', textFields, specialSorts)
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
	tag.remove(req, 'content')
		.then(function() {
			res.sendStatus(204);
		})
		.catch(function(err) {
			next(err);
		});
});

tagging.post(loginRequired(404), csrf.validate, function(req, res, next) {
	tag.add(req, 'content')
		.then(function() {
			res.sendStatus(204);
		})
		.catch(function(err) {
			next(err);
		});
});


module.exports = router;

