'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');


const maxResults = 1000;
const select = 'id,subject,bodyPreview,webLink,body,start,location,recurrence';


function call(connection, parameters, headers, results, db) {
	let nextLink, self = this;
	let eventId = parameters.event_id;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.top = outgoingParameters.top || maxResults;
	outgoingParameters.select = select;

	if (_.get(connection, 'endpoint_data.calendar.filter') != null) {
		outgoingParameters.filter = connection.endpoint_data.mailbox.filter;
	}

	return Promise.all([
		this.api.endpoint('CalendarEventInstances')({
			headers: outgoingHeaders,
			parameters: outgoingParameters
		}),

		this.api.endpoint('CalendarEventInstancesPage')({
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

			results = results.concat(data);

			nextLink = pageData.nextLink;

			if (!(/^2/.test(response.statusCode)) || (pageData.code)) {
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

				console.log('Next page params: ');
				console.log(params);

				let forwardParams = {
					top: params.$top,
					select: params.$select,
					skip: params.$skip,
					start_time: params.startDateTime,
					end_time: params.endDateTime,
					event_id: eventId
				};

				if (params.$filter) {
					forwardParams.filter = params.$filter;
				}

				return self.subPaginate(connection, forwardParams, {}, results, db);
			}
			else {
				console.log('Event Instance result count:' + results.length);
				return Promise.resolve(results);
			}
		})
		.catch(function(err) {
			console.log('Error calling Microsoft Event Instances:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;