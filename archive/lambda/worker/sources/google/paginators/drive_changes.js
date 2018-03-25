'use strict';

const _ = require('lodash');


const maxResults = 50;


function call(connection, parameters, headers, results, db) {
	let nextPageToken, newStartPageToken, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.max_results = outgoingParameters.max_results || maxResults;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.drive_changes.page_token') != null && parameters.page_token == null) {
		outgoingParameters.page_token = connection.endpoint_data.drive_changes.page_token;
	}

	if (outgoingParameters.page_token == null) {
		outgoingParameters.page_token = 1;
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

			nextPageToken = pageData.nextPageToken;
			newStartPageToken = pageData.newStartPageToken;

			results = results.concat(data);

			if (!(/^2/.test(response.statusCode))) {
				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			return Promise.resolve();
		})
		.then(function() {
			if (nextPageToken != null) {
				return self.paginate(connection, {
					page_token: nextPageToken
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
								'endpoint_data.drive_changes.page_token': newStartPageToken
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
			console.log('Error calling Google Drive Changes:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;