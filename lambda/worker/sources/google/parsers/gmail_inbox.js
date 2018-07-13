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
	events = new Array(data.length);

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i].message;

			let newMessage = {
				identifier: this.connection._id.toString('hex') + ':::gmail:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'google',
				user_id: this.connection.user_id,
				remote_id: item.id,
				type: 'text',
				embed_format: 'email'
			};

			let subject = _.find(item.payload.headers, function(header) {
				return header.name === 'Subject';
			});

			if (subject != null) {
				newMessage.title = subject.title;
			}

			if (item.payload.mimeType === 'text/plain' || item.payload.mimeType === 'text/html') {
				newMessage.embed_content = atob(item.payload.body.data).replace(/-/g, '+').replace(/_/g, '/');
			}
			else {
				if (item.payload.parts[0].mimeType === 'text/plain') {
					let bodyPart;

					if (item.payload.parts[1] && item.payload.parts[1].mimeType === 'text/html') {
						bodyPart = item.payload.parts[1];
					}
					else {
						bodyPart = item.payload.parts[0];
					}

					if (bodyPart.body.data != null) {
						newMessage.embed_content = atob(bodyPart.body.data).replace(/-/g, '+').replace(/_/g, '/');
					}
					else {
						newMessage.embed_content = 'No content, only attachment.';
					}
				}
				else if (item.payload.parts[0].mimeType === 'multipart/alternative') {
					if (Array.isArray(item.payload.parts[0].parts[0])) {
						newMessage.embed_content = atob(item.payload.parts[0].parts[0][1].body.data).replace(/-/g, '+').replace(/_/g, '/');
					}
					else if (item.payload.parts[0].parts[0].mimeType === 'text/plain') {
						let bodyPart;

						if (item.payload.parts[0].parts[1] && item.payload.parts[0].parts[1].mimeType === 'text/html') {
							bodyPart = item.payload.parts[0].parts[1];
						}
						else {
							bodyPart = item.payload.parts[0].parts[0];
						}

						if (bodyPart.body.data != null) {
							newMessage.embed_content = atob(bodyPart.body.data).replace(/-/g, '+').replace(/_/g, '/');
						}
						else {
							newMessage.embed_content = 'No content, only attachment.';
						}
					}
					else if (item.payload.parts[0].parts[0].mimeType === 'multipart/alternative') {
						let bodyPart;

						if (item.payload.parts[0].parts[0].parts[1] && item.payload.parts[0].parts[0].parts[1].mimeType === 'text/html') {
							bodyPart = item.payload.parts[0].parts[0].parts[1];
						}
						else {
							bodyPart = item.payload.parts[0].parts[0].parts[0];
						}

						if (bodyPart.body.data != null) {
							newMessage.embed_content = atob(bodyPart.body.data).replace(/-/g, '+').replace(/_/g, '/');
						}
						else {
							newMessage.embed_content = 'No content, only attachment.';
						}
					}
				}
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
				identifier: this.connection._id.toString('hex') + ':::messaged:::gmail:::' + item.id,
				datetime: moment(new Date(parseInt(item.internalDate))).utc().toDate(),
				content: [objectCache.content[newMessage.identifier]],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'google',
				user_id: this.connection.user_id
			};

			let localContacts = [];

			if (i === 0) {
				console.log(item.payload);
			}

			let fromHeader = _.find(item.payload.headers, function(header) {
				return header.name === 'From';
			});

			if (fromHeader === undefined) {
				fromHeader = _.find(item.payload.headers, function(header) {
					return header.name === 'Reply-To';
				});
			}

			let fromList = [];

			if (fromHeader !== undefined) {
				let parsed = emailParse.parseAddressList(fromHeader.value);

				if (parsed != null) {
					fromList = parsed;
				}
			}

			let fromUser = false;
			let toUser = false;

			let toHeader = _.find(item.payload.headers, function(header) {
				return header.name === 'To';
			});

			if (toHeader === undefined) {
				toHeader = _.find(item.payload.headers, function(header) {
					return header.name === 'Delivered-To';
				});
			}

			let toList = [];

			if (toHeader !== undefined) {
				let parsed = emailParse.parseAddressList(toHeader.value);

				if (parsed != null) {
					toList = parsed;
				}
			}

			for (let j = 0; j < fromList.length; j++) {
				let newContact = {};
				let parsed = fromList[j];

				newContact = {
					identifier: this.connection._id.toString('hex') + ':::' + parsed.address,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'google',
					user_id: this.connection.user_id,
					handle: parsed.address
				};

				if (parsed.name != null) {
					newContact.name = parsed.name;
				}

				if (newContact.handle !== item.profile.emailAddress) {
					if (!_.has(objectCache.contacts, newContact.identifier)) {
						objectCache.contacts[newContact.identifier] = newContact;

						contacts.push(objectCache.contacts[newContact.identifier]);
					}

					localContacts.push(objectCache.contacts[newContact.identifier]);
					toUser = true;
				}
				else {
					fromUser = true;
				}
			}

			for (let j = 0; j < toList.length; j++) {
				let newContact = {};
				let parsed = toList[j];

				newContact = {
					identifier: this.connection._id.toString('hex') + ':::' + parsed.address,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'google',
					user_id: this.connection.user_id,
					handle: parsed.address
				};

				if (parsed.name != null) {
					newContact.name = parsed.name;
				}

				if (newContact.handle !== item.profile.emailAddress) {
					if (!_.has(objectCache.contacts, newContact.identifier)) {
						objectCache.contacts[newContact.identifier] = newContact;

						contacts.push(objectCache.contacts[newContact.identifier]);
					}

					localContacts.push(objectCache.contacts[newContact.identifier]);
				}
				else {
					toUser = true;
				}
			}

			if (localContacts.length > 0) {
				if (toUser && fromUser) {
					newEvent.context = 'Received';
					newEvent.contact_interaction_type = 'with';
				}
				else if (toUser && !fromUser) {
					newEvent.context = 'Received';
					newEvent.contact_interaction_type = 'from';
				}
				else if (!toUser && fromUser) {
					newEvent.context = 'Sent';
					newEvent.contact_interaction_type = 'to';
				}

				newEvent.contacts = localContacts;
			}

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
