'use strict';

const _ = require('lodash');


function call(connection, parameters, headers, results, db, body) {
	let cursor, hasMore, mapping, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};
	let outgoingBody = body || {};

	outgoingHeaders['Content-Type'] = 'application/json';

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.edits.cursor') != null && outgoingBody.cursor != null) {
		outgoingBody.cursor = connection.endpoint_data.edits.cursor;
	}

	let options = {
		headers: outgoingHeaders,
		parameters: outgoingParameters
	};

	if (outgoingBody.hasOwnProperty('cursor')) {
		mapping = this.mapping + 'Continue';
		options.body = outgoingBody;
	}
	else {
		mapping = this.mapping;
		options.body = {
			path: '',
			recursive: true,
			include_media_info: true
		};
	}

	return Promise.all([
		this.api.endpoint(mapping).method('POST')(options),

		this.api.endpoint(mapping + 'Page').method('POST')(options)
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

			cursor = pageData.cursor;
			hasMore = pageData.has_more;

			results = results.concat(data);

			return Promise.resolve();
		})
		.then(function() {
			if (hasMore === true) {
				return self.paginate(connection, {}, {}, results, db, {
					cursor: cursor
				});
			}
			else {
				let promise = Promise.resolve();

				if (results.length > 0) {
					promise = promise.then(function() {
						return db.db('live').collection('connections').updateOne({
							_id: connection._id
						}, {
							$set: {
								'endpoint_data.edits.cursor': cursor
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
			console.log('Error calling Dropbox Edits:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;