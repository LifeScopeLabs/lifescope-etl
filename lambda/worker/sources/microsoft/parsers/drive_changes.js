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

			let newFile = {};
			let localFiles = [];
			let localFilesIds = {};
			let newContact = {};
			let localContacts = [];
			let localContactsIds = {};

			if (item.folder == null) {
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
					identifier: this.connection._id.toString('hex') + ':::drive:::' + item.id,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'microsoft',
					user_id: this.connection.user_id,
					url: item.webUrl,
					remote_id: item.id,
					'tagMasks.source': newTags,
					title: item.name,
					mimeType: item.mimeType,
					type: item.image != null ? 'image' : item.video != null ? 'video' : item.audio != null ? 'audio' : 'file'
				};

				if (item.thumbnails && item.thumbnails.length > 0) {
					let set = item.thumbnails[0];

					let largest = set.large ? set.large : set.medium ? set.medium : set.small;

					newFile.embed_thumbnail = largest.url;
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
					type: 'edited',
					provider_name: 'microsoft',
					identifier: this.connection._id.toString('hex') + ':::edited:::microsoft:::drive:::' + item.id + ':::' + item.lastModifiedDateTime,
					content: [objectCache.content[newFile.identifier]],
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					user_id: this.connection.user_id
				};

				newEvent.datetime = moment(item.lastModifiedDateTime).utc().toDate();

				if (item.createdBy && item.createdBy.user) {
					newContact = {
						identifier: this.connection._id.toString('hex') + ':::' + (item.createdBy.user.email || item.createdBy.user.id),
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'microsoft',
						user_id: this.connection.user_id,
						handle: (item.createdBy.user.email || item.createdBy.user.id),
						updated: moment().utc().toDate()
					};

					if (item.createdBy.user.displayName) {
						newContact.name = item.createdBy.user.displayName;
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

				if (item.lastModifiedBy && item.lastModifiedBy.user) {
					newContact = {
						identifier: this.connection._id.toString('hex') + ':::' + (item.lastModifiedBy.user.email || item.lastModifiedBy.user.id),
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'microsoft',
						user_id: this.connection.user_id,
						handle: (item.lastModifiedBy.user.email || item.lastModifiedBy.user.id),
						updated: moment().utc().toDate()
					};

					if (item.lastModifiedBy.user.displayName) {
						newContact.name = item.lastModifiedBy.user.displayName;
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
