'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


module.exports = function(data, db) {
	var contacts, content, events, locations, objectCache, tags;

	objectCache = {
		contacts: {},
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

			let newTags = [];

			for (let j = 0; j < item.tags.length; j++) {
				let tag = item.tags[j];

				let newTag = {
					tag: tag,
					user_id: this.connection.user_id
				};

				if (!_.has(objectCache.tags, newTag.tag)) {
					objectCache.tags[newTag.tag] = newTag;

					tags.push(objectCache.tags[newTag.tag]);
				}

				if (newTags.indexOf(newTag.tag) === -1) {
					newTags.push(newTag.tag);
				}
			}

			let newMedia = {
				identifier: this.connection._id.toString('hex') + ':::instagram:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'instagram',
				user_id: this.connection.user_id,
				url: item.link,
				remote_id: item.id,
				'tagMasks.source': newTags
			};

			if (item.caption) {
				newMedia.title = item.caption.text;
			}

			if (item.type === 'image') {
				newMedia.type = 'image';
				newMedia.embed_format = 'jpeg';
				newMedia.embed_content = item.images.standard_resolution.url;
				newMedia.embed_thumbnail = item.images.thumbnail.url;
			}
			else if (item.type === 'video') {
				newMedia.type = 'video';
				newMedia.embed_format = 'mp4';
				newMedia.embed_thumbnail = item.images.thumbnail.url;
				newMedia.embed_content = item.videos.standard_resolution.url;
			}

			content.push(newMedia);

			let datetime = moment(parseInt(item.created_time) * 1000).utc().toDate();

			let newEvent = {
				type: 'created',
				context: 'Shared',
				identifier: this.connection._id.toString('hex') + ':::created:::instagram:::' + item.id,
				datetime: datetime,
				content: [newMedia],
				contacts: [],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'instagram',
				user_id: this.connection.user_id
			};

			//if (item.comments.count > 0) {
			//	for (let j = 0; j < item.comments.count; j++) {
			//		let comment = item.comments.data[j];
			//
			//		if (comment != null) {
			//			let newContact = {
			//				identifier: this.connection._id.toString('hex') + ':::instagram:::' + comment.from.id,
			// connection_id: this.connection._id,
			// 	provider_id: this.connection.provider_id,
			// 	provider_name: 'instagram',
			//				user_id: this.connection.user_id,
			//				avatar_url: comment.from.profile_picture,
			//				remote_id: comment.from.id,
			//				handle: comment.from.username
			//			};
			//
			//			if (!_.has(objectCache.contacts, newContact.identifier)) {
			//				objectCache.contacts[newContact.identifier] = newContact;
			//				contacts.push(newContact);
			//			}
			//
			//			newEvent.contacts.push(objectCache.contacts[newContact.identifier]);
			//		}
			//	}
			//}

			if (item.location && item.location.longitude && item.location.latitude) {
				let newLocation = {
					identifier: this.connection._id.toString('hex') + ':::instagram:::' + datetime,
					datetime: datetime,
					estimated: false,
					geo_format: 'lat_lng',
					geolocation: [item.location.longitude, item.location.latitude],
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'instagram',
					user_id: this.connection.user_id
				};

				locations.push(newLocation);
				newEvent.location = newLocation;
			}

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
