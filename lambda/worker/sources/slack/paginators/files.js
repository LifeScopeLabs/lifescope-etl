'use strict';

const moment = require('moment');

const _ = require('lodash');


const maxResults = 200;


function call(connection, parameters, headers, results, db) {
	let nextPaging, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.count = outgoingParameters.count || maxResults;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.files.ts_from') != null && parameters.ts_from == null) {
		outgoingParameters.ts_from = connection.endpoint_data.files.ts_from;
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

			nextPaging = pageData;

			results = results.concat(data);

			if (!(/^2/.test(response.statusCode))) {
				console.log(response);

				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			return Promise.resolve();
		})
		.then(function() {
			if (parseInt(nextPaging.total) > 0 && (nextPaging.page !== nextPaging.pages)) {
				let forwardParams = {
					page: parseInt(nextPaging.page) + 1
				};

				return self.paginate(connection, forwardParams, {}, results, db);
			}
			else {
				let promise = Promise.resolve();

				if (results.length > 0) {
					promise = promise.then(function() {
						return db.db('live').collection('connections').updateOne({
							_id: connection._id
						}, {
							$set: {
								'endpoint_data.files.ts_from': moment().unix()
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
			console.log('Error calling Slack Files:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;