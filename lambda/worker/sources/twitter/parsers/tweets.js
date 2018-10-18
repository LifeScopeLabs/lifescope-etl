'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


module.exports = function(data, db) {
	var contacts, content, events, locations, objectCache, tags;

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

	if (data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let newTags = [];

			if (item.entities && item.entities.hashtags) {
				for (let j = 0; j < item.entities.hashtags.length; j++) {
					let tag = item.entities.hashtags[j];

					let newTag = {
						tag: tag.text,
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
			}

			let newMessage = {
				identifier: this.connection._id.toString('hex') + ':::twitter:::' + item.id_str,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'twitter',
				user_id: this.connection.user_id,
				remote_id: item.id_str,
				'tagMasks.source': newTags,
				text: item.text,
				type: 'text',
				url: 'https://twitter.com/' + this.connection.metadata.id_str + '/status/' + item.id_str
			};

			if (!_.has(objectCache.content, newMessage.identifier)) {
				objectCache.content[newMessage.identifier] = newMessage;

				content.push(objectCache.content[newMessage.identifier]);
			}

			let newMediaList = [];

			if (item.extended_entities && item.extended_entities.media) {
				for (let j = 0; j < item.extended_entities.media.length; j++) {
					let mediaItem = item.extended_entities.media[j];

					let newMedia = {
						identifier: this.connection._id.toString('hex') + ':::twitter:::' + mediaItem.id_str,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'twitter',
						remote_id: mediaItem.id_str,
						'tagMasks.source': newTags,
						url: mediaItem.expanded_url,
						user_id: this.connection.user_id
					};

					if (mediaItem.type === 'photo') {
						newMedia.type = 'image';
						newMedia.embed_format = 'jpeg';
						newMedia.embed_content = mediaItem.media_url_https;
						newMedia.embed_thumbnail = mediaItem.media_url_https + ':thumb';
					}
					else if (mediaItem.type === 'video') {
						let embedContent = _.find(mediaItem.video_info.variants, function(variant) {
							return variant.content_type === 'video/mp4' && variant.bitrate === 832000;
						});

						newMedia.type = 'video';
						newMedia.embed_format = embedContent.content_type.replace('video/', '');
						newMedia.embed_thumbnail = mediaItem.media_url_https + ':thumb';
						newMedia.embed_content = embedContent.url;
					}

					if (!_.has(objectCache.content, newMedia.identifier)) {
						objectCache.content[newMedia.identifier] = newMedia;

						content.push(objectCache.content[newMedia.identifier]);
					}

					newMediaList.push(objectCache.content[newMedia.identifier]);
				}
			}

			let newEvent = {
				type: 'messaged',
				context: 'Tweeted',
				identifier: this.connection._id.toString('hex') + ':::messaged:::twitter:::' + item.id_str,
				datetime: moment(new Date(item.created_at)).utc().toDate(),
				content: [objectCache.content[newMessage.identifier]].concat(newMediaList),
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'twitter',
				user_id: this.connection.user_id
			};

			if (item.in_reply_to_user_id_str) {
				let newContact = {
					identifier: this.connection._id.toString('hex') + ':::twitter:::' + item.in_reply_to_user_id_str,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'twitter',
					user_id: this.connection.user_id,
					remote_id: item.in_reply_to_user_id_str,
					handle: item.in_reply_to_screen_name
				};

				if (item.user[0] != null) {
					newContact.avatar_url = item.user[0].profile_image_url_https;
				}

				newEvent.contact_interaction_type = 'to';

				if (!_.has(objectCache.contacts, newContact.identifier)) {
					objectCache.contacts[newContact.identifier] = newContact;

					contacts.push(objectCache.contacts[newContact.identifier]);
				}

				newEvent.contacts = [objectCache.contacts[newContact.identifier]];
			}

			if (item.coordinates && item.coordinates.coordinates) {
				let datetime = moment(new Date(item.created_at)).utc().toDate();

				let newLocation = {
					identifier: this.connection._id.toString('hex') + ':::twitter:::' + datetime,
					datetime: datetime,
					estimated: false,
					geo_format: 'lat_lng',
					geolocation: item.coordinates.coordinates,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'twitter',
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
