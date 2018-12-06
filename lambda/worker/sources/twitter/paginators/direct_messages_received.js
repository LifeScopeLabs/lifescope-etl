'use strict';

const _ = require('lodash');

const perPage = 100;


function call(connection, parameters, headers, results, db) {
	let dataLength, lastItem, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.count = outgoingParameters.count || perPage;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.direct_messages_received.since_id') != null) {
		outgoingParameters.since_id = connection.endpoint_data.direct_messages_received.since_id;
	}

	return this.api.endpoint(this.mapping)({
		headers: outgoingHeaders,
		parameters: outgoingParameters
	})
		.then(function([data, response]) {
			if (!(/^2/.test(response.statusCode))) {
				console.log(response);

				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			if (results == null) {
				results = [];
			}

			results = results.concat(data);

			dataLength = data.length;
			lastItem = data[data.length - 1];

			return Promise.resolve();
		})
		.then(function() {
			if (dataLength === perPage) {
				return self.paginate(connection, {
					max_id: lastItem.id_str
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
								'endpoint_data.direct_messages_received.since_id': results[0].id_str
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
			console.log('Error calling Twitter Direct Messages Received:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;