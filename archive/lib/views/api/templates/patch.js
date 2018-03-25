'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const httpErrors = require('http-errors');
const moment = require('moment');

const gid = require('../../../util/gid');


function patch(req, type, Constructor, schema) {
	let hexId = req.params.id;
	let body = req.body;
	let elastic = env.databases.elastic;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			return validate(schema, body);
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
				updated: moment.utc().toDate()
			});

			return mongo.db('live').collection(type).updateOne(filter, {
				$set: body
			})
				.then(function(data) {
					if (data.result.n === 0) {
						return Promise.reject(httpErrors(404));
					}

					return mongo.db('live').collection(type).findOne(filter);
				});
		})
		.then(function(document) {
			// No need to check whether or not `document` is `null` since this will have been effectively
			// checked by the update in the first place.

			let esDocument = _.omit(document, '_id');

			return elastic.index({
				index: 'explorer',
				type: type,
				id: hexId,
				body: esDocument
			})
				.catch(function(err) {
					// TODO: Queue a job to clean up the search index.
					env.logger.error(err);
				})
				.then(function() {
					let response = new Constructor(document);

					return Promise.resolve(response);
				});
		});
}


module.exports = patch;

