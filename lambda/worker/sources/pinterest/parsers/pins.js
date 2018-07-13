'use strict';

const querystring = require('querystring');
const url = require('url');

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


const fileTypeRegex = /\.([a-z]+)$/g;


module.exports = function(data, db) {
	var contacts, content, events, locations, objectCache, tags, self = this;

	objectCache = {
		contacts: {},
		content: {},
		events: {},
		tags: {}
	};

	contacts = [];
	content = [];
	locations = [];
	tags = [];
	events = new Array(data.length);

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let datetime = moment(item.datetime).toDate();

			let newEvent = {
				type: 'commented',
				context: 'Pinned',
				identifier: this.connection._id.toString('hex') + ':::created:::pinterest:::' + item.id,
				datetime: datetime,
				content: [],
				contacts: [],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'pinterest',
				user_id: this.connection.user_id
			};

			let newImage = {
				identifier: this.connection._id.toString('hex') + ':::pinterest:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'pinterest',
				user_id: this.connection.user_id,
				url: item.url,
				text: item.note,
				remote_id: item.id,
				type: 'image'
			};

			if (_.has(item, 'image.original.url')) {
				let match = fileTypeRegex.exec(item.image.original.url);

				if (match) {
					newImage.embed_content = item.image.original.url;
					newImage.embed_format = match[1];
				}
			}

			if (!_.has(objectCache.content, newImage.identifier)) {
				objectCache.content[newImage.identifier] = newImage;

				content.push(objectCache.content[newImage.identifier]);
			}

			newEvent.content.push(objectCache.content[newImage.identifier]);

			if (item.youtube_oembed && typeof item.youtube_oembed === 'object') {
				let parsed = url.parse(item.attribution.url);
				let parameters = querystring.parse(parsed);
				let videoId = parameters.v;

				let newVideo = {
					identifier: this.connection._id.toString('hex') + ':::youtube:::' + videoId,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'youtube',
					user_id: this.connection.user_id,
					url: item.link,
					remote_id: videoId,
					embed_content: item.youtube_oembed.html,
					embed_thumbnail: item.youtube_oembed.thumbnail_url,
					embed_format: 'iframe',
					type: 'video'
				};

				if (!_.has(objectCache.content, newVideo.identifier)) {
					objectCache.content[newVideo.identifier] = newVideo;

					content.push(objectCache.content[newVideo.identifier]);
				}

				newEvent.content.push(objectCache.content[newVideo.identifier]);
			}

			let newPage = {
				identifier: this.connection._id.toString('hex') + ':::pinterest:::source:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'pinterest',
				user_id: this.connection.user_id,
				url: item.link,
				title: item.note,
				remote_id: item.link,
				type: 'web-page'
			};

			if (!_.has(objectCache.content, newPage.identifier)) {
				objectCache.content[newPage.identifier] = newPage;

				content.push(objectCache.content[newPage.identifier]);
			}

			newEvent.content.push(objectCache.content[newPage.identifier]);

			events[i] = newEvent;
		}

		return mongoTools.mongoInsert({
			contacts: contacts,
			content: content,
			events: events,
			locations: locations,
			tags: tags
		}, db);
	}
	else {
		return Promise.resolve(null);
	}
};
