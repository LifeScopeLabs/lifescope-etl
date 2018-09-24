'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');


const maxResults = 50;

const select = 'id,createdDateTime,lastModifiedDateTime,name,webUrl,createdBy,lastModifiedBy,folder,file,deleted,audio,video,image';


function call(connection, parameters, headers, results, db) {
	let nextLink, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.max_results = outgoingParameters.max_results || maxResults;
	outgoingParameters.select = select;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.drive_changes.token') != null && parameters.token == null) {
		outgoingParameters.token = connection.endpoint_data.drive_changes.token;
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

			nextLink = pageData.nextLink;

			results = results.concat(data);

			if (!(/^2/.test(response.statusCode))) {
				console.log(response);

				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			return Promise.resolve();
		})
		.then(function() {
			if (nextLink != null) {
				let parsed = url.parse(nextLink);
				let params = querystring.parse(parsed.query);

				let forwardParams = {
					token: params.token,
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
				let promise = Promise.resolve();

				if (results.length > 0) {
					promise = promise.then(function() {
						return db.db('live').collection('connections').updateOne({
							_id: connection._id
						}, {
							$set: {
								'endpoint_data.drive_changes.token': outgoingParameters.token
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
			console.log('Error calling Microsoft Drive Changes:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;