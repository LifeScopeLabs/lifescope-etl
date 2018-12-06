'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');
const moment = require('moment');


const maxResults = 100;
const select = 'id,sentDateTime,subject,bodyPreview,webLink,body,from,toRecipients,ccRecipients,bccRecipients';


function call(connection, parameters, headers, results, db) {
	let nextLink, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.top = outgoingParameters.top || maxResults;
	outgoingParameters.select = select;

	if (_.get(connection, 'endpoint_data.mailbox.filter') != null) {
		outgoingParameters.filter = connection.endpoint_data.mailbox.filter;
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

			nextLink = pageData.nextLink;

			results = results.concat(data);

			return Promise.resolve();
		})
		.then(function() {
			if (nextLink != null) {
				let parsed = url.parse(nextLink);
				let params = querystring.parse(parsed.query);

				let forwardParams = {
					top: params.$top,
					select: params.$select,
					skip: params.$skip
				};

				if (params.$filter) {
					forwardParams.filter = params.$filter;
				}

				return self.paginate(connection, forwardParams, {}, results, db);
			}
			else {
				return db.db('live').collection('connections').updateOne({
					_id: connection._id
				}, {
					$set: {
						'endpoint_data.mailbox.filter': 'SentDateTime ge ' + moment().utc().toJSON()
					}
				})
					.then(function() {
						return Promise.resolve(results);
					});
			}
		})
		.catch(function(err) {
			console.log('Error calling Microsoft Mailbox:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;