'use strict';

const _ = require('lodash');

const count = 50;


function call(connection, parameters, headers, results, db) {
	let next, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.count = outgoingParameters.count || count;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.posts.min_id') != null && outgoingParameters.min_id == null) {
		outgoingParameters.min_id = connection.endpoint_data.posts.min_id;
	}

	return Promise.all([
		this.api.endpoint(this.mapping)({
			headers: outgoingHeaders,
			parameters: outgoingParameters
		}),

		this.api.endpoint(this.mapping + 'Page')({
			headers: outgoingHeaders,
			parameters: outgoingParameters
		})
	])
		.then(function([dataResult, pageResult]) {
			let [data, response] = dataResult;
			let [pageData, pageResponse] = pageResult;

			if (results == null) {
				results = [];
			}

			next = pageData.next_max_id ? pageData.next_max_id : null;

			results = results.concat(data);

			if (!(/^2/.test(response.statusCode))) {
				console.log(response);

				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			return Promise.resolve();
		})
		.then(function() {
			if (next != null) {
				return self.paginate(connection, {
					max_id: next
				}, {}, results);
			}
			else {
				let promise = Promise.resolve();

				if (results.length > 0) {
					promise = promise.then(function() {
						return db.db('live').collection('connections').updateOne({
							_id: connection._id
						}, {
							$set: {
								'endpoint_data.posts.min_id': results[results.length - 1].id
							}
						});
					});
				}

				return promise.then(function() {
					return Promise.resolve(results);
				});
			}
		})
		.catch(function(err) {
			console.log('Error calling Instagram Posts:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;