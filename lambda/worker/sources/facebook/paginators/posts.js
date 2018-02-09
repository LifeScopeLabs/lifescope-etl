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

const limit = 2;


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

	_.each(subFields, function(list, fieldName) {
		let matchIndex = _.findIndex(fieldsCopy, function(field) {
			return field === fieldName;
		});

		let photoMatchIndex = _.findIndex(photoFieldsCopy, function(field) {
			return field === fieldName;
		});

		let videoMatchIndex = _.findIndex(videoFieldsCopy, function(field) {
			return field === fieldName;
		});

		fieldsCopy[matchIndex] += '{' + subFields[fieldName].join() + '}';
		photoFieldsCopy[photoMatchIndex] += '{' + subFields[fieldName].join() + '}';
		videoFieldsCopy[videoMatchIndex] += '{' + subFields[fieldName].join() + '}';
	});

	outgoingParameters.fields = fieldsCopy.join();
	outgoingParameters.related_photo_fields = photoFieldsCopy.join();
	outgoingParameters.related_video_fields = videoFieldsCopy.join();

	console.log(outgoingParameters);

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

				return self.paginate(connection, {
					paging_token: params.__paging_token,
					since: params.since,
					until: params.until
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
								'endpoint_data.posts.since': moment().unix()
							}
						});
					});
				}

				return promise.then(function() {
					console.log(results);
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

