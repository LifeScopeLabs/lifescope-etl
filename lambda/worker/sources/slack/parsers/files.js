'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


let tagRegex = /#[^#\s]+/g;


module.exports = function(data, db) {
	var contacts, content, events, objectCache, tags, self = this;

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

			let newFile = {};
			let localFiles = [];
			let localFilesIds = {};
			let newContact = {};
			let localContacts = [];
			let localContactsIds = {};

			let newTags = [];
			let titleTags = item.name.match(tagRegex);

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

			newFile = {
				identifier: this.connection._id.toString('hex') + ':::slack:::files:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'slack',
				user_id: this.connection.user_id,
				url: item.permalink,
				remote_id: item.id,
				'tagMasks.source': newTags,
				title: item.name,
				mimeType: item.mimetype,
				type: /image/.test(item.mimetype) === true ? 'image' : /video/.test(item.mimetype) === true ? 'video' : /audio/.test(item.mimetype) === true ? 'audio' : /text/.test(item.mimetype) === true ? 'text' : 'file'
			};

			if (item.thumb_360 != null && item.thumb_360.length > 0) {
				newFile.embed_thumbnail = item.thumb_360_gif != null ? item.thumb_360_gif : item.thumb_360;
			}

			if (!_.has(objectCache.content, newFile.identifier)) {
				objectCache.content[newFile.identifier] = newFile;

				localFiles.push(objectCache.content[newFile.identifier]);
				localFilesIds[newFile.identifier] = true;

				content.push(objectCache.content[newFile.identifier]);
			}
			else {
				if (!_.has(localFilesIds, newFile.identifier)) {
					localFiles.push(objectCache.content[newFile.identifier]);
					localFilesIds[newFile.identifier] = true;
				}
			}

			let newEvent = {
				type: 'created',
				provider_name: 'slack',
				identifier: this.connection._id.toString('hex') + ':::created:::slack:::file:::' + item.id,
				content: [objectCache.content[newFile.identifier]],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				user_id: this.connection.user_id
			};

			newEvent.datetime = moment(item.created * 1000).utc().toDate();

			if (item.user_hydrated && item.user_hydrated.email !== self.connection.metadata.email) {
				let user = item.user_hydrated;

				newContact = {
					identifier: this.connection._id.toString('hex') + ':::' + user.email,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'slack',
					user_id: this.connection.user_id,
					handle: user.email,
					name: user.real_name,
					updated: moment().utc().toDate()
				};

				if (user.image_512 || user.image_192 || user.image_72 || user.image_48 || user.image_32 || user.image_24) {
					newContact.avatar_url = user.image_512 ? user.image_512 : user.image_192 ? user.image_192 : user.image_72 ? user.image_72 : user.image_48 ? user.image_48 : user.image_32 ? user.image_32 : user.image_24;
				}

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
			}

			newEvent.contacts = localContacts;
			newEvent.contact_interaction_type = 'with';

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
