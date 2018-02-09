'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


module.exports = function(data, db) {
	var contacts, content, events, locations, objectCache, tags, self = this;

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

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let datetime = moment(item.datetime).toDate();

			let newEvent = {
				type: 'messaged',
				context: 'Posted',
				provider_name: 'facebook',
				identifier: this.connection._id.toString('hex') + ':::created:::instagram:::' + item.id,
				datetime: datetime,
				content: [],
				contacts: [],
				connection: this.connection._id,
				user_id: this.connection.user_id
			};

			if (item.message != null) {
				let newMessage = {
					identifier: this.connection._id.toString('hex') + ':::facebook:::' + item.id,
					connection: this.connection._id,
					user_id: this.connection.user_id,
					provider_name: 'facebook',
					url: item.permalink_url,
					text: item.message,
					remote_id: item.id,
					type: 'text'
				};


				if (!_.has(objectCache.content, newMessage.identifier)) {
					objectCache.content[newMessage.identifier] = newMessage;

					content.push(objectCache.content[newMessage.identifier]);
				}

				newEvent.content.push(objectCache.content[newMessage.identifier]);
			}

			if (item.status_type === 'added_video' && !item.video.error) {
				let newVideo = {
					identifier: this.connection._id.toString('hex') + ':::facebook:::' + item.object_id,
					connection: this.connection._id,
					user_id: this.connection.user_id,
					url: 'https://facebook.com' + item.video.permalink_url,
					embed_content: item.video.embed_html,
					embed_thumbnail: item.video.picture,
					embed_format: 'iframe',
					provider_name: 'facebook',
					remote_id: item.object_id,
					type: 'video'
				};

				if (item.video.description) {
					newVideo.text = item.video.description;
				}

				if (!_.has(objectCache.content, newVideo.identifier)) {
					objectCache.content[newVideo.identifier] = newVideo;

					content.push(objectCache.content[newVideo.identifier]);
				}

				newEvent.content.push(objectCache.content[newVideo.identifier]);

				if (item.video.from != null && item.video.from.id !== this.connection.metadata.id) {
					let newContact = {
						identifier: this.connection._id.toString('hex') + ':::facebook:::' + item.video.id,
						connection: this.connection._id,
						user_id: this.connection.user_id,
						provider_name: 'facebook',
						remote_id: item.video.id,
						avatar_url: item.video.from.picture.data.url,
						name: item.video.from.name
					};

					if (!_.has(objectCache.contacts, newContact.identifier)) {
						objectCache.contacts[newContact.identifier] = newContact;

						contacts.push(objectCache.contacts[newContact.identifier]);
					}

					newEvent.contacts.push(objectCache.contacts[newContact.identifier]);
				}
			}

			if (item.status_type === 'added_photos' && !item.photo.error) {
				let newPhoto = {
					identifier: this.connection._id.toString('hex') + ':::facebook:::' + item.object_id,
					connection: this.connection._id,
					user_id: this.connection.user_id,
					text: item.message,
					url: item.photo.link,
					embed_content: item.photo.images[0].source,
					embed_thumbnail: item.photo.picture,
					embed_format: 'jpeg',
					provider_name: 'facebook',
					remote_id: item.object_id,
					type: 'image'
				};

				if (!_.has(objectCache.content, newPhoto.identifier)) {
					objectCache.content[newPhoto.identifier] = newPhoto;

					content.push(objectCache.content[newPhoto.identifier]);
				}

				newEvent.content.push(objectCache.content[newPhoto.identifier]);

				if (item.photo.from != null && item.photo.from.id !== this.connection.metadata.id) {
					let newContact = {
						identifier: this.connection._id.toString('hex') + ':::facebook:::' + item.photo.id,
						connection: this.connection._id,
						user_id: this.connection.user_id,
						provider_name: 'facebook',
						remote_id: item.photo.id,
						avatar_url: item.photo.from.picture.data.url,
						name: item.photo.from.name
					};

					if (!_.has(objectCache.contacts, newContact.identifier)) {
						objectCache.contacts[newContact.identifier] = newContact;

						contacts.push(objectCache.contacts[newContact.identifier]);
					}

					newEvent.contacts.push(objectCache.contacts[newContact.identifier]);
				}
			}

			if (item.with_tags != null) {
				_.each(item.with_tags.data, function(contact) {
					if (contact.id !== self.connection.metadata.id) {
						let newContact = {
							identifier: self.connection._id.toString('hex') + ':::facebook:::' + contact.id,
							connection: self.connection._id,
							user_id: self.connection.user_id,
							provider_name: 'facebook',
							remote_id: contact.id,
							avatar_url: contact.picture.data.url,
							name: contact.name
						};

						if (!_.has(objectCache.contacts, newContact.identifier)) {
							objectCache.contacts[newContact.identifier] = newContact;

							contacts.push(objectCache.contacts[newContact.identifier]);
						}

						newEvent.contacts.push(objectCache.contacts[newContact.identifier]);
					}
				});

				newEvent.contact_interaction_type = 'with';
			}

			if (item.to != null) {
				_.each(item.to.data, function(contact) {
					if (contact.id !== self.connection.metadata.id) {
						let newContact = {
							identifier: self.connection._id.toString('hex') + ':::facebook:::' + contact.id,
							connection: self.connection._id,
							user_id: self.connection.user_id,
							provider_name: 'facebook',
							remote_id: contact.id,
							avatar_url: contact.picture.data.url,
							name: contact.name
						};

						if (!_.has(objectCache.contacts, newContact.identifier)) {
							objectCache.contacts[newContact.identifier] = newContact;

							contacts.push(objectCache.contacts[newContact.identifier]);
						}

						newEvent.contacts.push(objectCache.contacts[newContact.identifier]);
					}
				});

				newEvent.contact_interaction_type = 'to';
			}

			if (item.from != null && item.from.id !== this.connection.metadata.id) {
				let newContact = {
					identifier: this.connection._id.toString('hex') + ':::facebook:::' + item.from.id,
					connection: this.connection._id,
					user_id: this.connection.user_id,
					provider_name: 'facebook',
					remote_id: item.from.id,
					avatar_url: item.from.picture.data.url,
					name: item.from.name
				};

				if (!_.has(objectCache.contacts, newContact.identifier)) {
					objectCache.contacts[newContact.identifier] = newContact;

					contacts.push(objectCache.contacts[newContact.identifier]);
				}

				newEvent.contacts.push(objectCache.contacts[newContact.identifier]);

				newEvent.contact_interaction_type = 'from';
			}

			if (item.place && item.place.location && item.place.location.longitude && item.place.location.latitude) {
				let newLocation = {
					identifier: this.connection._id.toString('hex') + ':::facebook:::' + datetime,
					datetime: datetime,
					estimated: false,
					geo_format: 'lat_lng',
					geolocation: [item.place.location.longitude, item.place.location.latitude],
					connection: this.connection._id,
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
