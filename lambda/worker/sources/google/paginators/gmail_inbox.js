'use strict';

const _ = require('lodash');
const moment = require('moment');


const maxResults = 40;
const maxRunTime = 240000;


function call(connection, parameters, headers, results, db, startTime) {
	let earlyCutoff, nextPageToken, self = this;

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

	if (_.get(connection, 'endpoint_data.gmail_inbox.page_token') != null && !parameters.page_token) {
		outgoingParameters.page_token = connection.endpoint_data.gmail_inbox.page_token;
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

			nextPageToken = pageData.nextPageToken;

			results = results.concat(data);

			return Promise.resolve();
		})
		.then(function() {
			if (startTime == null) {
				startTime = moment().utc();
			}

			let dateNow = moment().utc();

			earlyCutoff = dateNow - startTime > maxRunTime;

			if (nextPageToken != null && dateNow - startTime < maxRunTime) {
				return new Promise(function(resolve, reject) {
					setTimeout(function() {
						resolve();
					}, 1200);
				})
					.then(function() {
						return self.paginate(connection, {
							page_token: nextPageToken
						}, {}, results, db, startTime);
					})
			}
			else {
				let promise = Promise.resolve();

				if (results.length > 0) {
					let $set;

					if (earlyCutoff) {
						$set = {
							$set: {
								'endpoint_data.gmail_inbox.page_token': nextPageToken
							}
						};
					}
					else {
						$set = {
							$set: {
								'endpoint_data.gmail_inbox.q': '"after:' + moment().utc().subtract(1, 'day').format('YYYY/MM/DD') + '"'
							},
							$unset: {
								'endpoint_data.gmail_inbox.page_token': true
							}
						};
					}

					promise = promise.then(function() {
						return db.db('live').collection('connections').updateOne({
							_id: connection._id
						}, $set);
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