'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


let tagRegex = /#[^#\s]+/g;


module.exports = function(data, db) {
	var contacts, content, events, locations, objectCache, tags, self = this;

	objectCache = {
		contacts: {},
		content: {},
		tags: {}
	};

	contacts = [];
	content = [];
	tags = [];
	locations = [];
	events = [];

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let newContact = {};
			let localContacts = [];
			let localContactsIds = {};
			let localContent = [];
			let localContentIds = {};

			let date = item.start.dateTime ? item.start.dateTime : item.start.date;

			let invite = {
				identifier: this.connection._id.toString('hex') + ':::google:::calendar:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'google',
				user_id: this.connection.user_id,
				remote_id: item.id,
				title: item.summary,
				text: item.description,
				url: item.htmlLink,
				type: 'invite'
			};

			if (!_.has(objectCache.content, invite.identifier)) {
				objectCache.content[invite.identifier] = invite;

				localContent.push(objectCache.content[invite.identifier]);
				localContentIds[invite.identifier] = true;

				content.push(objectCache.content[invite.identifier]);
			}
			else {
				if (!_.has(localContentIds, invite.identifier)) {
					localContent.push(objectCache.content[invite.identifier]);
					localContentIds[invite.identifier] = true;
				}
			}

			let newEvent = {
				type: 'attended',
				provider_name: 'google',
				identifier: this.connection._id.toString('hex') + ':::attended:::google:::calendar:::' + item.id,
				datetime: moment(date).utc().toDate(),
				content: [invite],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				user_id: this.connection.user_id
			};

			if (item.attachments && item.attachments.length > 0) {
				for (let j = 0; j < item.attachments.length; j++) {
					let file = item.attachments[j];

					let newTags = [];
					let titleTags = file.title.match(tagRegex);

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

					let newFile = {
						identifier: this.connection._id.toString('hex') + ':::drive:::' + file.fileId,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'google',
						user_id: this.connection.user_id,
						url: file.fileUrl,
						remote_id: file.fileId,
						'tagMasks.source': newTags,
						title: file.title,
						type: 'file',
						mimetype: file.mimeType
					};

					if (!_.has(objectCache.content, newFile.identifier)) {
						objectCache.content[newFile.identifier] = newFile;

						localContent.push(objectCache.content[newFile.identifier]);
						localContentIds[newFile.identifier] = true;

						content.push(objectCache.content[newFile.identifier]);
					}
					else {
						if (!_.has(localContentIds, newFile.identifier)) {
							localContent.push(objectCache.content[newFile.identifier]);
							localContentIds[newFile.identifier] = true;
						}
					}

					newEvent.content.push(objectCache.content[newFile.identifier]);
				}
			}

			if (item.creator && item.creator.self !== true) {
				newContact = {
					identifier: this.connection._id.toString('hex') + ':::' + item.creator.email,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'google',
					user_id: this.connection.user_id,
					handle: item.creator.email,
					name: item.creator.displayName,
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
			}

			if (item.organizer && item.organizer.self !== true) {
				newContact = {
					identifier: this.connection._id.toString('hex') + ':::' + item.organizer.email,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'google',
					user_id: this.connection.user_id,
					handle: item.organizer.email,
					name: item.organizer.displayName,
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
			}

			if (item.attendees && item.attendees.length > 0) {
				_.each(item.attendees, function(attendee) {
					if (attendee.self && attendee.self !== true) {
						newContact = {
							identifier: self.connection._id.toString('hex') + ':::' + attendee.email,
							connection_id: self.connection._id,
							provider_id: self.connection.provider_id,
							provider_name: 'google',
							user_id: self.connection.user_id,
							handle: attendee.email,
							name: attendee.displayName,
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
					}
				});
			}

			if (localContacts.length > 0) {
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
				locations: locations,
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
