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

			let datetime = moment(item.start.dateTime).utc().toDate();

			let invite = {
				identifier: this.connection._id.toString('hex') + ':::microsoft:::calendar:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'microsoft',
				user_id: this.connection.user_id,
				remote_id: item.id,
				url: item.webLink,
				type: 'invite'
			};

			if (item.subject != null) {
				invite.title = item.subject;
			}

			if (item.body.contentType === 'html') {
				invite.embed_content = item.body.content;
			}
			else {
				invite.text = item.body.content;
			}

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
				provider_name: 'microsoft',
				identifier: this.connection._id.toString('hex') + ':::attended:::microsoft:::calendar:::' + item.id,
				datetime: datetime,
				content: [invite],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				user_id: this.connection.user_id
			};

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

			if (item.organizer && item.organizer.emailAddress) {
				newContact = {
					identifier: this.connection._id.toString('hex') + ':::' + item.organizer.emailAddress.address,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'microsoft',
					user_id: this.connection.user_id,
					handle: item.organizer.emailAddress.address,
					updated: moment().utc().toDate()
				};

				if (item.organizer.emailAddress.name) {
					newContact.name = item.organizer.emailAddress.name;
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

			if (item.attendees && item.attendees.length > 0) {
				_.each(item.attendees, function(attendee) {
					newContact = {
						identifier: self.connection._id.toString('hex') + ':::' + attendee.emailAddress.address,
						connection_id: self.connection._id,
						provider_id: self.connection.provider_id,
						provider_name: 'microsoft',
						user_id: self.connection.user_id,
						handle: attendee.emailAddress.address,
						updated: moment().utc().toDate()
					};

					if (attendee.emailAddress.name) {
						newContact.name = attendee.emailAddress.name;
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
				});
			}

			if (localContacts.length > 0) {
				newEvent.contacts = localContacts;
				newEvent.contact_interaction_type = 'with';
			}

			if (item.location && item.location.coordinates && (item.location.coordinates.longitude != null && item.location.coordinates.latitude != null)) {
				let newLocation = {
					identifier: this.connection._id.toString('hex') + ':::microsoft:::calendar:::' + datetime,
					datetime: datetime,
					estimated: false,
					geo_format: 'lat_lng',
					geolocation: [item.location.coordinates.longitude, item.location.coordinates.latitude],
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'microsoft',
					user_id: this.connection.user_id
				};

				locations.push(newLocation);

				newEvent.location = newLocation;
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
