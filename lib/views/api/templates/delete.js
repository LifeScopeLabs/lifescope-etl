'use strict';

const Promise = require('bluebird');
const httpErrors = require('http-errors');

const gid = require('../../../util/gid');


function del(req, type) {
	let hexId = req.params.id;
	let elastic = env.databases.elastic;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			return mongo.db('live').collection(type).deleteOne({
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
			// Elastic deletion depends on MongoDB deletion in that a user may not have permission to delete the
			// specified document. If the Promise chain gets to here we're guaranteed to have a document that existed in
			// MongoDB that the user had permission to delete.
			return elastic.delete({
				index: 'explorer',
				type: type,
				id: hexId
			})
				.catch(function(err) {
					// TODO: Queue a job to clean up the search index.

					return Promise.resolve();
				});
		});
}


module.exports = del;
