'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const httpErrors = require('http-errors');
const moment = require('moment');

const gid = require('../../../util/gid');


function post(req, type, Constructor, schema) {
	let body = req.body;
	let elastic = env.databases.elastic;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate(schema, body)
		.catch(function() {
			return Promise.reject(httpErrors(400));
		})
		.then(function() {
			let document = _.assign(body, {
				_id: gid(),
				user_id: req.user._id,
				created: moment.utc().toDate(),
				updated: moment.utc().toDate()
			});

			return mongo.db('live').collection(type).insert(document)
				.then(function() {
					let esDocument = _.omit(document, '_id');

					return elastic.index({
						index: 'explorer',
						type: type,
						id: document._id.toString('hex'),
						body: esDocument
					})
						.catch(function(err) {
							// TODO: Queue a job to clean up the search index.

							return Promise.resolve();
						});
				})
				.then(function() {
					let response = new Constructor(document);

					return Promise.resolve(response);
				});
		});
}


module.exports = post;

