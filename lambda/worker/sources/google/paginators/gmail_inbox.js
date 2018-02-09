'use strict';

const _ = require('lodash');
const moment = require('moment');


const maxResults = 200;


function call(connection, parameters, headers, results, db) {
	let nextPageToken, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.max_results = outgoingParameters.max_results || maxResults;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.gmail_inbox.q') != null) {
		outgoingParameters.q = connection.endpoint_data.gmail_inbox.q;
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
								'endpoint_data.gmail_inbox.q': '"after:' + moment().utc().subtract(1, 'day').format('YYYY/MM/DD') + '"'
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
			console.log('Error calling Google Gmail Inbox:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;