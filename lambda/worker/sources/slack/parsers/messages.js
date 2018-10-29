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

			let newContact = {};
			let localContacts = [];
			let localContactsIds = {};
			let localContent = [];
			let localContentIds = {};

			let datetime = moment(parseInt(item.ts.split('.')[0]) * 1000).utc().toDate();

			let newTags = [];
			let bodyTags = item.text.match(tagRegex);

			if (bodyTags != null) {
				for (let j = 0; j < bodyTags.length; j++) {
					let tag = bodyTags[j].slice(1);

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

			let message = {
				identifier: this.connection._id.toString('hex') + ':::slack:::message:::' + item.channel + ':::' + item.ts,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'slack',
				user_id: this.connection.user_id,
				text: item.text,
				type: 'text'
			};

			if (newTags.length > 0) {
				message['tagMasks.source'] = newTags;
			}

			if (!_.has(objectCache.content, message.identifier)) {
				objectCache.content[message.identifier] = message;

				localContent.push(objectCache.content[message.identifier]);
				localContentIds[message.identifier] = true;

				content.push(objectCache.content[message.identifier]);
			}
			else {
				if (!_.has(localContentIds, message.identifier)) {
					localContent.push(objectCache.content[message.identifier]);
					localContentIds[message.identifier] = true;
				}
			}

			let newEvent = {
				type: 'messaged',
				provider_name: 'slack',
				identifier: this.connection._id.toString('hex') + ':::messaged:::slack:::conversation:::' + item.channel + ':::' + item.ts,
				datetime: datetime,
				content: [message],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				user_id: this.connection.user_id
			};

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

			if (localContacts.length > 0) {
				newEvent.contacts = localContacts;
				newEvent.contact_interaction_type = 'from';
			}
			else {
				newEvent.contact_interaction_type = 'to';
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
