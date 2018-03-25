'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');


function call(connection, parameters, headers, results) {
	let next, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.limit = outgoingParameters.limit || 50;

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

			if (results == null) {
				results = [];
			}

			next = pageData.next ? pageData.next : null;

			results = results.concat(data);

			if (!(/^2/.test(response.statusCode))) {
				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			return Promise.resolve();
		})
		.then(function() {
			if (next != null) {
				let parsed = url.parse(next);
				let params = querystring.parse(parsed.query);

				return self.paginate(connection, {
					offset: params.offset,
					limit: params.limit
				}, {}, results);
			}
			else {
				return Promise.resolve(results);
			}
		})
		.catch(function(err) {
			console.log('Error calling Spotify Playlists:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;