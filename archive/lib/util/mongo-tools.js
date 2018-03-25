'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');
const uuid = require('uuid');

const amalgamateTags = require('./amalgamate-tags');
const gid = require('./gid');

const indexActionCache = {
		contacts: {
			index: {
				_index: 'explorer',
				_type: 'contacts'
			}
		},
		content: {
			index: {
				_index: 'explorer',
				_type: 'content'
			}
		},
		events: {
			index: {
				_index: 'explorer',
				_type: 'events'
			}
		},
		locations: {
			index: {
				_index: 'explorer',
				_type: 'locations'
			}
		},
		things: {
			index: {
				_index: 'explorer',
				_type: 'things'
			}
		}
	};


function MongoEvent(data) {
	this.connection_id = data.connection_id;
	this.contact_interaction_type = data.contact_interaction_type;
	this.context = data.context;
	this.datetime = data.datetime;
	this.identifier = data.identifier;
	//this.places = data.places;
	this.provider_id = data.provider_id;
	this.provider_name = data.provider_name;
	this.source = data.source;
	this.tagMasks = data.tagMasks;
	this.type = data.type;
	this.updated = data.updated;
	this.user_id = data.user_id;

	if (data.contacts) {
		this.contacts = new Array(data.contacts.length);

		for (let i = 0; i < data.contacts.length; i++) {
			this.contacts[i] = data.contacts[i]._id;
		}
	}

	if (data.content) {
		this.content = new Array(data.content.length);

		for (let i = 0; i < data.content.length; i++) {
			this.content[i] = data.content[i]._id;
		}
	}

	if (data.things) {
		this.things = new Array(data.things.length);

		for (let i = 0; i < data.things.length; i++) {
			this.things[i] = data.things[i]._id;
		}
	}

	if (data.location) {
		this.location = data.location._id;
	}

	if (this.tagMasks == null) {
		delete this.tagMasks;
	}
}

MongoEvent.prototype.toJSON = function() {
	return {
		id: this.id,
		connection_id: this.connection_id,
		contact_interaction_type: this.contact_interaction_type,
		context: this.context,
		contacts: this.contacts,
		content: this.content,
		created: this.created,
		datetime: this.datetime,
		location: this.location,
		places: this.places,
		provider_id: this.provider_id,
		provider_name: this.provider_name,
		tagMasks: this.tagMasks,
		things: this.things,
		type: this.type
	};
};

function bulkUpsert(type, dataList) {
	let mongo = env.databases.mongo;

	let bulk = mongo.db('live').collection(type).initializeUnorderedBulkOp();
	let identifiers = new Array(dataList.length);

	for (let i = 0; i < dataList.length; i++) {
		let data = dataList[i];
		let id = uuid();

		identifiers[i] = data.identifier;

		_.assign(data, {
			updated: moment.utc().toDate()
		});

		bulk.find({
			identifier: data.identifier
		})
		.upsert()
		.updateOne({
				$set: data,
				$setOnInsert: {
					_id: gid(id),
					created: data.updated
				}
			});
	}

	return bulk.execute().then(function() {
		return mongo.db('live').collection(type).find({
			identifier: {
				$in: identifiers
			}
		}).toArray();
	});
}

function bulkTagUpsert(dataList) {
	let mongo = env.databases.mongo;

	let bulk = mongo.db('live').collection('tags').initializeUnorderedBulkOp();
	let tags = new Array(dataList.length);

	for (let i = 0; i < dataList.length; i++) {
		let data = dataList[i];
		let id = uuid();

		tags[i] = data.tag;

		bulk.find({
			tag: data.tag
		})
			.upsert()
			.updateOne({
				$set: data,
				$setOnInsert: {
					_id: gid(id),
					created: data.updated
				}
			});
	}

	return bulk.execute().then(function() {
		return mongo.db('live').collection('tags').find({
			tag: {
				$in: tags
			}
		}).toArray();
	});
}

function mongoElasticInsert(objects) {
	var contactsUpsert, contentUpsert, locationsUpsert, tagsUpsert, thingsUpsert;

	if (objects.contacts && objects.contacts.length > 0) {
		contactsUpsert = bulkUpsert('contacts', objects.contacts);
	}

	if (objects.content && objects.content.length > 0) {
		contentUpsert = bulkUpsert('content', objects.content);
	}

	if (objects.locations && objects.locations.length > 0) {
		locationsUpsert = bulkUpsert('locations', objects.locations);
	}

	if (objects.tags && objects.tags.length > 0) {
		tagsUpsert = bulkTagUpsert(objects.tags);
	}

	if (objects.things && objects.things.length > 0) {
		thingsUpsert = bulkUpsert('things', objects.thing);
	}

	return Promise.all([
		contactsUpsert,
		contentUpsert,
		locationsUpsert,
		tagsUpsert,
		thingsUpsert
	])
		.then(function(result) {
			let [hydratedContacts, hydratedContent, hydratedLocations, hydratedTags, hydratedThings] = result;

			if (hydratedContacts != null) {
				for (let i = 0; i < hydratedContacts.length; i++) {
					let index = _.findIndex(objects.contacts, function(contact) {
						return contact.identifier === hydratedContacts[i].identifier;
					});

					objects.contacts[index]._id = hydratedContacts[i]._id;
					objects.contacts[index].tagMasks = hydratedContacts[i].tagMasks;

					delete objects.contacts[index]['tagMasks.source'];
				}
			}

			if (hydratedContent != null) {
				for (let i = 0; i < hydratedContent.length; i++) {
					let index = _.findIndex(objects.content, function(content) {
						return content.identifier === hydratedContent[i].identifier;
					});

					objects.content[index]._id = hydratedContent[i]._id;
					objects.content[index].tagMasks = hydratedContent[i].tagMasks;

					delete objects.content[index]['tagMasks.source'];
				}
			}

			if (hydratedLocations != null) {
				for (let i = 0; i < hydratedLocations.length; i++) {
					let index = _.findIndex(objects.locations, function(location) {
						return location.identifier === hydratedLocations[i].identifier;
					});

					objects.locations[index]._id = hydratedLocations[i]._id;
					objects.locations[index].tagMasks = hydratedLocations[i].tagMasks;

					delete objects.locations[index]['tagMasks.source'];
				}
			}

			if (hydratedThings != null) {
				for (let i = 0; i < hydratedThings.length; i++) {
					let index = _.findIndex(objects.things, function(thing) {
						return thing.identifier === hydratedThings[i].identifier;
					});

					objects.things[index]._id = hydratedThings[i]._id;
					objects.things[index].tagMasks = hydratedThings[i].tagMasks;

					delete objects.things[index]['tagMasks.source'];
				}
			}

			let mongoEvents = new Array(objects.events.length);

			for (let i = 0; i < objects.events.length; i++) {
				mongoEvents[i] = new MongoEvent(objects.events[i]);
			}

			return bulkUpsert('events', mongoEvents);
		})
		.then(function(hydratedEvents) {
			let indexBodyLength = objects.events.length;

			if (objects.contacts) {
				indexBodyLength += objects.contacts.length;
			}

			if (objects.content) {
				indexBodyLength += objects.content.length;
			}

			if (objects.locations) {
				indexBodyLength += objects.locations.length;
			}

			if (objects.things) {
				indexBodyLength += objects.things.length;
			}

			let bulkIndexBody = new Array(2 * indexBodyLength);
			let startIndex = 0;

			if (objects.contacts) {
				for (let i = 0; i < objects.contacts.length; i++) {
					let contact = objects.contacts[i];
					let id = contact._id.toString('hex');

					delete contact._id;

					contact.connection = contact.connection.toString('hex');
					contact.user_id = contact.user_id.toString('hex');

					amalgamateTags(contact);

					bulkIndexBody[startIndex + 2 * i] = _.cloneDeep(indexActionCache.contacts);
					bulkIndexBody[startIndex + 2 * i].index._id = id;
					bulkIndexBody[startIndex + 2 * i + 1] = _.cloneDeep(contact);

					delete contact.identifier;
					delete contact.connection;
					delete contact.source;
					delete contact.remote_id;
					delete contact.created;
					delete contact.updated;

					contact.id = id;
				}

				startIndex = startIndex + 2 * objects.contacts.length;
			}

			if (objects.content) {
				for (let i = 0; i < objects.content.length; i++) {
					let content = objects.content[i];
					let id = content._id.toString('hex');

					delete content._id;

					content.connection = content.connection.toString('hex');
					content.user_id = content.user_id.toString('hex');

					amalgamateTags(content);

					bulkIndexBody[startIndex + 2 * i] = _.cloneDeep(indexActionCache.content);
					bulkIndexBody[startIndex + 2 * i].index._id = id;
					bulkIndexBody[startIndex + 2 * i + 1] = _.cloneDeep(content);

					delete content.identifier;
					delete content.connection;
					delete content.source;
					delete content.remote_id;
					delete content.created;
					delete content.updated;

					content.id = id;
				}

				startIndex = startIndex + 2 * objects.content.length;
			}

			if (objects.locations) {
				for (let i = 0; i < objects.locations.length; i++) {
					let location = objects.locations[i];
					let id = location._id.toString('hex');

					delete location._id;

					location.connection = location.connection.toString('hex');
					location.user_id = location.user_id.toString('hex');

					amalgamateTags(location);

					bulkIndexBody[startIndex + 2 * i] = _.cloneDeep(indexActionCache.locations);
					bulkIndexBody[startIndex + 2 * i].index._id = id;
					bulkIndexBody[startIndex + 2 * i + 1] = _.cloneDeep(location);

					delete location.identifier;
					delete location.connection;
					delete location.source;
					delete location.remote_id;
					delete location.created;
					delete location.updated;

					location.id = id;
				}

				startIndex = startIndex + 2 * objects.locations.length;
			}

			if (objects.things) {
				for (let i = 0; i < objects.things.length; i++) {
					let thing = objects.things[i];
					let id = thing._id.toString('hex');

					delete thing._id;

					thing.connection = thing.connection.toString('hex');
					thing.user_id = thing.user_id.toString('hex');

					amalgamateTags(thing);

					bulkIndexBody[startIndex + 2 * i] = _.cloneDeep(indexActionCache.things);
					bulkIndexBody[startIndex + 2 * i].index._id = id;
					bulkIndexBody[startIndex + 2 * i + 1] = _.cloneDeep(thing);

					delete thing.identifier;
					delete thing.connection;
					delete thing.source;
					delete thing.remote_id;
					delete thing.created;
					delete thing.updated;

					thing.id = id;
				}

				startIndex = startIndex + 2 * objects.things.length;
			}

			for (let i = 0; i < hydratedEvents.length; i++) {
				let index = _.findIndex(objects.events, function(event) {
					return event.identifier === hydratedEvents[i].identifier;
				});

				let event = objects.events[index];

				event.tagMasks = hydratedEvents[i].tagMasks;

				delete event['tagMasks.source'];

				let id = hydratedEvents[i]._id.toString('hex');

				delete objects.events[index]._id;

				event.connection = event.connection.toString('hex');
				event.user_id = event.user_id.toString('hex');

				amalgamateTags(event);

				bulkIndexBody[startIndex + 2 * i] = _.cloneDeep(indexActionCache.events);
				bulkIndexBody[startIndex + 2 * i].index._id = id;
				bulkIndexBody[startIndex + 2 * i + 1] = event;
			}

			return env.databases.elastic.bulk({
				body: bulkIndexBody
			});
		})
		.then(function(bulkResult) {
			if (bulkResult.errors === true) {
				for (let i = 0; i < bulkResult.items.length; i++) {
					let item = bulkResult.items[i];

					if (item.index.status !== 200) {
						return Promise.reject(new Error(item.index.error.reason));
					}
				}
			}
			else {
				return Promise.resolve(null);
			}
		});
}


module.exports = {
	bulkUpsert: bulkUpsert,
	MongoEvent: MongoEvent,
	mongoElasticInsert: mongoElasticInsert
};
