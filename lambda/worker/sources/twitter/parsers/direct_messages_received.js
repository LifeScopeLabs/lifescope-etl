'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


module.exports = function(data, db) {
	var contacts, content, events, objectCache, tags;

	objectCache = {
		contacts: {},
		events: {},
		tags: {}
	};

	contacts = [];
	content = [];
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
				connection: this.connection._id,
				user_id: this.connection.user_id,
				remote_id: item.id_str,
				'tagMasks.source': newTags,
				text: item.text,
				type: 'text'
			};

			content.push(newMessage);

			let newMediaList = [];

			if (item.extended_entities && item.extended_entities.media) {
				for (let j = 0; j < item.extended_entities.media.length; j++) {
					let mediaItem = item.extended_entities.media[j];

					let newMedia = {
						identifier: this.connection._id.toString('hex') + ':::twitter:::' + mediaItem.id_str,
						connection: this.connection._id,
						user_id: this.connection.user_id,
						url: mediaItem.expanded_url,
						remote_id: mediaItem.id_str,
						'tagMasks.source': newTags
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

					content.push(newMedia);
					newMediaList.push(newMedia);
				}
			}

			let newEvent = {
				type: 'messaged',
				context: 'Recieved direct message',
				provider_name: 'twitter',
				identifier: this.connection._id.toString('hex') + ':::messaged:::twitter:::' + item.id_str,
				datetime: moment(new Date(item.created_at)).utc().toDate(),
				content: [newMessage].concat(newMediaList),
				connection: this.connection._id,
				user_id: this.connection.user_id
			};

			let newContact = {
				identifier: this.connection._id.toString('hex') + ':::twitter:::' + item.sender.id_str,
				connection: this.connection._id,
				user_id: this.connection.user_id,
				avatar_url: item.sender.profile_image_url_https,
				remote_id: item.sender.id_str,
				handle: item.sender.screen_name,
				name: item.sender.name
			};

			newEvent.contact_interaction_type = 'from';

			if (!_.has(objectCache.contacts, newContact.identifier)) {
				objectCache.contacts[newContact.identifier] = newContact;

				contacts.push(objectCache.contacts[newContact.identifier]);
			}

			newEvent.contacts = [objectCache.contacts[newContact.identifier]];

			events[i] = newEvent;
		}

		return mongoTools.mongoInsert({
			contacts: contacts,
			content: content,
			events: events,
			tags: tags
		}, db);
	}
	else {
		return Promise.resolve(null);
	}
};
