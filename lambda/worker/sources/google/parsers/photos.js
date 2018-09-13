'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


let tagRegex = /#[^#\s]+/g;


module.exports = function(data, db) {
	var contacts, content, events, objectCache, tags;

	objectCache = {
		contacts: {},
		content: {},
		tags: {}
	};

	contacts = [];
	content = [];
	tags = [];
	events = [];

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let newMedia = {};
			let localMedia = [];
			let localMediaIds = {};
			let newContact = {};
			let localContacts = [];
			let localContactsIds = {};

			let newTags = [];
			let titleTags = item.filename.match(tagRegex);

			if (titleTags != null) {
				for (let j = 0; j < titleTags.length; j++) {
					let tag = titleTags[j].slice(1);

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
			}

			newMedia = {
				identifier: this.connection._id.toString('hex') + ':::photos:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'google',
				user_id: this.connection.user_id,
				url: item.productUrl,
				remote_id: item.id,
				'tagMasks.source': newTags,
				title: item.filename,
				mimetype: item.mimeType
			};

			/*
				Photos' baseUrl's are only valid for an hour, and if it's a video, it only returns a thumbnail.
				On the normal once/day schedule for free tier, this link will be invalid for the vast majority of the day.
				The current general solution to embedding Photos is to share them and use a third-party service to make an embed,
				but making EVERY SINGLE PHOTO a user has publicly shared is a really bad idea.
				So, for now, we're skipping the embeddable photo/videos, and just having external links.
				Once we get paid tiers, we might either have sources re-run often enough that the links never get stale,
				or download the photos/videos directly and store them in Mongo.
			*/
			if (item.mediaMetadata.photo != null) {
				newMedia.type = 'image';
				// newMedia.embed_format = item.mimeType.replace('image/', '');
				// newMedia.embed_content = item.baseUrl;
			}
			else if (item.mediaMetadata.video != null) {
				newMedia.type = 'video';
				// newMedia.embed_format = item.mimeType.replace('video/', '');
				// newMedia.embed_content = item.baseUrl;
			}

			if (!_.has(objectCache.content, newMedia.identifier)) {
				objectCache.content[newMedia.identifier] = newMedia;

				localMedia.push(objectCache.content[newMedia.identifier]);
				localMediaIds[newMedia.identifier] = true;

				content.push(objectCache.content[newMedia.identifier]);
			}
			else {
				if (!_.has(localMediaIds, newMedia.identifier)) {
					localMedia.push(objectCache.content[newMedia.identifier]);
					localMediaIds[newMedia.identifier] = true;
				}
			}

			let newEvent = {
				type: 'created',
				provider_name: 'google',
				identifier: this.connection._id.toString('hex') + ':::created:::google:::photos:::' + item.id,
				content: [objectCache.content[newMedia.identifier]],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				user_id: this.connection.user_id
			};

			if (item.mediaMetadata && item.mediaMetadata.creationTime) {
				newEvent.datetime = moment(item.mediaMetadata.creationTime).utc().toDate();
			}
			else {
				newEvent.datetime = moment().utc().toDate();
			}

			if (item.contributorInfo) {
				newContact = {
					identifier: this.connection._id.toString('hex') + ':::' + item.contributorInfo.displayName,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'google',
					user_id: this.connection.user_id,
					avatar_url: item.contributorInfo.profilePictureBaseUrl,
					name: item.contributorInfo.displayName,
					updated: moment().utc().toDate()
				};
				
				if (!_.has(objectCache.contacts, newContact.identifier)) {
					objectCache.contacts[newContact.identifier] = newContact;

					localContacts.push(objectCache.contacts[newContact.identifier]);
					localContactsIds[newContact.identifier] = true;

					contacts.push(objectCache.contacts[newContact.identifier]);
				}
				else {
					if (!_.has(localContactsIds, newContact.identifier)) {
						localContacts.push(objectCache.contacts[newContact.identifier]);
						localContactsIds[newContact.identifier] = true;
					}
				}

				newEvent.contacts = localContacts;
				newEvent.contact_interaction_type = 'with';
			}

			events.push(newEvent);
		}

		if (events.length > 0) {
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
	}
	else {
		return Promise.resolve(null);
	}
};
