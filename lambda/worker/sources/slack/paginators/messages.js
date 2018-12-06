'use strict';

const _ = require('lodash');

const conversationHistory = require('./conversation_history');


const maxResults = 200;
const types = 'public_channel,private_channel,im,mpim';


function call(connection, parameters, headers, results, db) {
	let hasMore, nextCursor, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.limit = outgoingParameters.limit || maxResults;
	outgoingParameters.types = types;

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

			hasMore = pageData.has_more;
			nextCursor = _.get(pageData, 'response_metadata.next_cursor');

			if (!self.subPaginate) {
				self.subPaginate = conversationHistory;
			}

			let pagePromises = _.map(data, function(item) {
				let parameters = {
					channel: item.id
				};

				return self.subPaginate(connection, parameters, {}, [], db);
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

			if (hasMore === true) {
				let forwardParams = {
					cursor: nextCursor
				};

				return self.paginate(connection, forwardParams, {}, results, db);
			}
			else {
				return Promise.resolve(results);
			}
		})
		.catch(function(err) {
			console.log('Error calling Slack User Conversations:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;