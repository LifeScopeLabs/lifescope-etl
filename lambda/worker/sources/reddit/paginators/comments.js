'use strict';

const _ = require('lodash');


function call(connection, parameters, headers, results) {
	let after, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.limit = outgoingParameters.limit || 100;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
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

			if (!(/^2/.test(response.statusCode))) {
				console.log(response);

				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			if (results == null) {
				results = [];
			}

			after = pageData.data.after;

			results = results.concat(data);

			return Promise.resolve();
		})
		.then(function() {
			if (after != null) {
				return self.paginate(connection, {
					after: after
				}, {}, results);
			}
			else {
				return Promise.resolve(results);
			}
		})
		.catch(function(err) {
			console.log('Error calling reddit Comments:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;