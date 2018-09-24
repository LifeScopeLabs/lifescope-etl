'use strict';

const _ = require('lodash');


function call(connection, parameters, headers, results, db) {
	let count, offset, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.limit = outgoingParameters.limit || 50;

	if (_.get(connection, 'endpoint_data.history.start_time') != null && parameters.start_time == null) {
		outgoingParameters.start_time = connection.endpoint_data.history.start_time;
	}

	if (outgoingParameters.start_time == null) {
		outgoingParameters.start_time = '2015-01-01T00:00:00Z';
	}

	return this.api.endpoint(this.mapping)({
			headers: outgoingHeaders,
			parameters: outgoingParameters
		})
		.then(function([data, response]) {
			if (results == null) {
				results = [];
			}

			count = data.length;

			results = results.concat(data);

			if (!(/^2/.test(response.statusCode))) {
				console.log(response);

				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			return Promise.resolve();
		})
		.then(function() {
			if (count === outgoingParameters.limit) {
				let nextStartTime = results[results.length - 1].pickup.time;

				return self.paginate(connection, {
					start_time: nextStartTime
				}, {}, results, db);
			}
			else {
				let promise = Promise.resolve();

				if (results.length > 0) {
					promise = promise.then(function() {
						return db.db('live').collection('connections').updateOne({
							_id: connection._id
						}, {
							$set: {
								'endpoint_data.history.start_time': results[results.length - 1].pickup.time
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
			console.log('Error calling Lyft History:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;