'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


const fileTypeRegex = /\.([a-z]+)$/g;


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
				type: 'created',
				context: 'Created Board',
				provider_name: 'pinterest',
				identifier: this.connection._id.toString('hex') + ':::created:::pinterest:::' + item.id,
				datetime: datetime,
				content: [],
				contacts: [],
				connection: this.connection._id,
				user_id: this.connection.user_id
			};

			let newBoard = {
				identifier: this.connection._id.toString('hex') + ':::pinterest:::board:::' + item.id,
				connection: this.connection._id,
				user_id: this.connection.user_id,
				provider_name: 'pinterest',
				url: item.url,
				text: item.description,
				title: item.name,
				remote_id: item.id,
				type: 'collection'
			};

			if (!_.has(objectCache.content, newBoard.identifier)) {
				objectCache.content[newBoard.identifier] = newBoard;

				content.push(objectCache.content[newBoard.identifier]);
			}

			newEvent.content.push(objectCache.content[newBoard.identifier]);

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
