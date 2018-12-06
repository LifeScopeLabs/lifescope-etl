'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');


const perPage = 30;
const nextRegExp = /<(\S+)>;\s+rel="next"/;


function call(connection, parameters, headers, results, db) {
	let next, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.per_page = outgoingParameters.per_page || perPage;

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

			let linkHeader = response.headers.link || response.headers.Link;

			if (linkHeader) {
				let split = linkHeader.split(',');

				let match = _.find(split, function(item) {
					return item.match(nextRegExp);
				});

				if (match != null) {
					next = match.match(nextRegExp)[1];
				}
			}

			results = results.concat(data);

			return Promise.resolve();
		})
		.then(function() {
			if (next != null) {
				let parsed = url.parse(next);
				let params = querystring.parse(parsed.query);

				return self.paginate(connection, {
					page: params.page
				}, {}, results, db);
			}
			else {
				return Promise.resolve(results);
			}
		})
		.catch(function(err) {
			console.log('Error calling GitHub Events:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;