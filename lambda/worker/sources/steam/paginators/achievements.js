'use strict';

const _ = require('lodash');

const perPage = 2;


function call(connection, parameters, headers, results, db) {
	let dataLength, lastItem, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
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

			return Promise.resolve();
		})
		.then(function() {
			return Promise.resolve(results);
		})
		.catch(function(err) {
			console.log('Error calling Steam Achievements:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;