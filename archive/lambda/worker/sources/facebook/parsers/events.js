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
				type: 'visited',
				context: 'Attended Event',
				provider_name: 'facebook',
				identifier: this.connection._id.toString('hex') + ':::visited:::facebook:::' + item.id,
				datetime: datetime,
				content: [],
				contacts: [],
				connection: this.connection._id,
				user_id: this.connection.user_id
			};

			if (!item.photo.error) {
				let newPhoto = {
					identifier: this.connection._id.toString('hex') + ':::facebook:::' + item.photo.id,
					connection: this.connection._id,
					user_id: this.connection.user_id,
					text: item.message,
					url: item.photo.link,
					embed_content: item.photo.images[0].source,
					embed_thumbnail: item.photo.picture,
					embed_format: 'jpeg',
					provider_name: 'facebook',
					remote_id: item.photo.id,
					type: 'image'
				};

				if (!_.has(objectCache.content, newPhoto.identifier)) {
					objectCache.content[newPhoto.identifier] = newPhoto;

					content.push(objectCache.content[newPhoto.identifier]);
				}

				newEvent.content.push(objectCache.content[newPhoto.identifier]);

				if (item.photo.from != null && item.photo.from.id !== this.connection.metadata.id) {
					let from = item.photo.from_user.id ? item.photo.from_user : item.photo.from_page.id ? item.photo.from_page : item.photo.from_group;

					let newContact = {
						identifier: this.connection._id.toString('hex') + ':::facebook:::' + from.id,
						connection: this.connection._id,
						user_id: this.connection.user_id,
						provider_name: 'facebook',
						remote_id: from.id,
						avatar_url: item.video.from_group.id ? from.icon : from.picture.data.url,
						name: from.name
					};

					if (!_.has(objectCache.contacts, newContact.identifier)) {
						objectCache.contacts[newContact.identifier] = newContact;

						contacts.push(objectCache.contacts[newContact.identifier]);
					}

					newEvent.contacts.push(objectCache.contacts[newContact.identifier]);
				}
			}

			if (item.owner != null && item.owner.id !== this.connection.metadata.id) {
				let newContact = {
					identifier: this.connection._id.toString('hex') + ':::facebook:::' + item.owner.id,
					connection: this.connection._id,
					user_id: this.connection.user_id,
					provider_name: 'facebook',
					remote_id: item.owner.id,
					avatar_url: item.owner.picture.data.url,
					name: item.owner.name
				};

				if (!_.has(objectCache.contacts, newContact.identifier)) {
					objectCache.contacts[newContact.identifier] = newContact;

					contacts.push(objectCache.contacts[newContact.identifier]);
				}

				newEvent.contacts.push(objectCache.contacts[newContact.identifier]);

				newEvent.contact_interaction_type = 'with';
			}

			if (item.place && item.place.location && item.place.location.longitude && item.place.location.latitude) {
				let newLocation = {
					identifier: this.connection._id.toString('hex') + ':::' + this.connection.user_id.toString('hex') + ':::' + datetime.toString('hex') + ':::facebook:::' + datetime,
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
