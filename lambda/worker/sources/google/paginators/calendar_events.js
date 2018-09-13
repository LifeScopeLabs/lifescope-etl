'use strict';

const _ = require('lodash');

const calendarEventList = require('./calendar_event_list');


const maxResults = 1;


function call(connection, parameters, headers, results, db) {
	let nextPageToken, nextSyncToken, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.max_results = outgoingParameters.max_results || maxResults;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.calendar_list.sync_token') != null && parameters.sync_token == null) {
		outgoingParameters.sync_token = connection.endpoint_data.calendar_events.calendar_list.sync_token;
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
			nextSyncToken = pageData.nextSyncToken;

			if (!(/^2/.test(response.statusCode))) {
				console.log(response);

				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			if (!self.subPaginate) {
				self.subPaginate = calendarEventList;
			}

			let pagePromises = _.map(data, function(item) {
				if (/holiday@group.v.calendar.google.com/.test(item.id) === false) {
					let parameters = {
						calendar_id: item.id
					};

					return self.subPaginate(connection, parameters, {}, [], db);
				}
				else {
					return Promise.resolve([]);
				}
			});

			return Promise.all(pagePromises);
		})
		.then(function(massResults) {
			if (results == null) {
				results = [];
			}

			_.each(massResults, function(individualResult) {
				results = results.concat(individualResult);
			});

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
								'endpoint_data.calendar_list.sync_token': nextSyncToken
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
			console.log('Error calling Google Calendar List:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;