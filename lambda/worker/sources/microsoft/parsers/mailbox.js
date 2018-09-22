'use strict';

const _ = require('lodash');
const emailParse = require('email-addresses');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


let tagRegex = /#[^#\s]+/g;


function atob(inputString) {
	return new Buffer(inputString, 'base64').toString('binary');
}


module.exports = function(data, db) {
	var contacts, content, events, objectCache, tags;

	objectCache = {
		contacts: {},
		content: {},
		events: {},
		tags: {}
	};

	contacts = [];
	content = [];
	tags = [];
	events = [];

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			if (item.from != null) {
				let newMessage = {
					identifier: this.connection._id.toString('hex') + ':::microsoft:::mailbox:::' + item.id,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'microsoft',
					user_id: this.connection.user_id,
					remote_id: item.id,
					type: 'text',
					embed_format: 'email',
					url: item.webLink
				};

				if (item.subject != null) {
					newMessage.title = item.subject;
				}

				if (item.body.contentType === 'html') {
					newMessage.embed_content = item.body.content;
				}
				else {
					newMessage.text = item.body.content;
				}

				let newTags = [];

				if (newMessage.title != null) {
					let titleTags = newMessage.title.match(tagRegex);

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
				}

				newMessage['tagMasks.source'] = newTags;

				if (!_.has(objectCache.content, newMessage.identifier)) {
					objectCache.content[newMessage.identifier] = newMessage;

					content.push(objectCache.content[newMessage.identifier]);
				}

				let newEvent = {
					type: 'messaged',
					identifier: this.connection._id.toString('hex') + ':::messaged:::microsoft:::mailbox:::' + item.id,
					datetime: moment(item.sentDateTime).utc().toDate(),
					content: [objectCache.content[newMessage.identifier]],
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'microsoft',
					user_id: this.connection.user_id
				};

				let localContacts = [];

				let newContact = {};

				newContact = {
					identifier: this.connection._id.toString('hex') + ':::' + item.from.emailAddress.address,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'microsoft',
					user_id: this.connection.user_id,
					handle: item.from.emailAddress.address
				};

				if (item.from.emailAddress.name != null) {
					newContact.name = item.from.emailAddress.name;
				}

				if (!_.has(objectCache.contacts, newContact.identifier)) {
					objectCache.contacts[newContact.identifier] = newContact;

					contacts.push(objectCache.contacts[newContact.identifier]);
				}

				localContacts.push(objectCache.contacts[newContact.identifier]);

				for (let j = 0; j < item.toRecipients.length; j++) {
					let newContact = {};
					let parsed = item.toRecipients[j];

					newContact = {
						identifier: this.connection._id.toString('hex') + ':::' + parsed.emailAddress.address,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'google',
						user_id: this.connection.user_id,
						handle: parsed.emailAddress.address
					};

					if (parsed.emailAddress.name != null) {
						newContact.name = parsed.emailAddress.name;
					}

					if (!_.has(objectCache.contacts, newContact.identifier)) {
						objectCache.contacts[newContact.identifier] = newContact;

						contacts.push(objectCache.contacts[newContact.identifier]);
					}

					localContacts.push(objectCache.contacts[newContact.identifier]);
				}

				for (let j = 0; j < item.ccRecipients.length; j++) {
					let newContact = {};
					let parsed = item.ccRecipients[j];

					newContact = {
						identifier: this.connection._id.toString('hex') + ':::' + parsed.emailAddress.address,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'google',
						user_id: this.connection.user_id,
						handle: parsed.emailAddress.address
					};

					if (parsed.emailAddress.name != null) {
						newContact.name = parsed.emailAddress.name;
					}

					if (!_.has(objectCache.contacts, newContact.identifier)) {
						objectCache.contacts[newContact.identifier] = newContact;

						contacts.push(objectCache.contacts[newContact.identifier]);
					}

					localContacts.push(objectCache.contacts[newContact.identifier]);
				}

				for (let j = 0; j < item.bccRecipients.length; j++) {
					let newContact = {};
					let parsed = item.bccRecipients[j];

					newContact = {
						identifier: this.connection._id.toString('hex') + ':::' + parsed.emailAddress.address,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'google',
						user_id: this.connection.user_id,
						handle: parsed.emailAddress.address
					};

					if (parsed.emailAddress.name != null) {
						newContact.name = parsed.emailAddress.name;
					}

					if (!_.has(objectCache.contacts, newContact.identifier)) {
						objectCache.contacts[newContact.identifier] = newContact;

						contacts.push(objectCache.contacts[newContact.identifier]);
					}

					localContacts.push(objectCache.contacts[newContact.identifier]);
				}

				if (localContacts.length > 0) {
					newEvent.context = 'Messaged';
					newEvent.contact_interaction_type = 'with';

					newEvent.contacts = localContacts;
				}

				events.push(newEvent);
			}
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
