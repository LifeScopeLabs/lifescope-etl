'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');
const moment = require('moment');


const fields = [
	'id',
	'caption',
	'created_time',
	'description',
	'from',
	'icon',
	'link',
	'message',
	'message_tags',
	'name',
	'object_id',
	'parent_id',
	'permalink_url',
	'picture',
	'place',
	'properties',
	'source',
	'status_type',
	'to',
	'type',
	'updated_time',
	'with_tags'
];

const userFields = [
	'id',
	'first_name',
	'gender',
	'last_name',
	'locale',
	'name',
	'picture'
];

const pageFields = [
	'id',
	'name',
	'picture'
];

const groupFields = [
	'id',
	'name',
	'icon'
];

const photoFields = [
	'id',
	'from',
	'images',
	'link',
	'name',
	'picture'
];

const videoFields = [
	'id',
	'created_time',
	'description',
	'embed_html',
	'from',
	'permalink_url',
	'picture',
	'source',
	'title'
];

const subFields = {
	from: [
		'id'
	],
	to: [
		'id',
		'birthday',
		'cover',
		'email',
		'first_name',
		'gender',
		'last_name',
		'name',
		'picture'
	],
	with_tags: [
		'id',
		'birthday',
		'cover',
		'email',
		'first_name',
		'gender',
		'last_name',
		'name',
		'picture'
	]
};

const limit = 20;


function call(connection, parameters, headers, results, db) {
	let next, self = this;

	let outgoingHeaders = headers || {};
	let outgoingParameters = parameters || {};

	outgoingHeaders['X-Connection-Id'] = connection.remote_connection_id.toString('hex');
	outgoingParameters.limit = outgoingParameters.limit || limit;

	if (this.population != null) {
		outgoingHeaders['X-Populate'] = this.population;
	}

	if (_.get(connection, 'endpoint_data.posts.since') != null && outgoingParameters.since == null) {
		outgoingParameters.since = connection.endpoint_data.posts.since;
	}

	let fieldsCopy = _.clone(fields);
	let photoFieldsCopy = _.clone(photoFields);
	let videoFieldsCopy = _.clone(videoFields);
	let userFieldsCopy = _.clone(userFields);
	let pageFieldsCopy = _.clone(pageFields);
	let groupFieldsCopy = _.clone(groupFields);

	_.each(subFields, function(list, fieldName) {
		let matchIndex = _.findIndex(fieldsCopy, function(field) {
			return field === fieldName;
		});

		fieldsCopy[matchIndex] += '{' + subFields[fieldName].join() + '}';
	});

	outgoingParameters.fields = fieldsCopy.join();
	outgoingParameters.related_photo_fields = photoFieldsCopy.join();
	outgoingParameters.related_video_fields = videoFieldsCopy.join();
	outgoingParameters.related_user_fields = userFieldsCopy.join();
	outgoingParameters.related_page_fields = pageFieldsCopy.join();
	outgoingParameters.related_group_fields = groupFieldsCopy.join();

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

			next = pageData.paging ? pageData.paging.next : null;

			results = results.concat(data);

			if (!(/^2/.test(response.statusCode))) {
				let body = JSON.parse(response.body);

				return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
			}

			return Promise.resolve();
		})
		.then(function() {
			if (next != null) {
				let parsed = url.parse(next);
				let params = querystring.parse(parsed.query);

				let forwardParams = {
					paging_token: params.__paging_token,
				};

				if (params.since) {
					forwardParams.since = params.since;
				}

				if (params.until) {
					forwardParams.until = params.until;
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
								'endpoint_data.posts.since': moment().unix()
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
			console.log('Error calling Facebook Posts:');
			console.log(err);

			return Promise.reject(err);
		});
}


module.exports = call;

