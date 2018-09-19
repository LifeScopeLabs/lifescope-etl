'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');



module.exports = function(data, db) {
	let events;
	let locations = [];

	events = new Array(data.length);

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let datetime = moment(item.start_time * 1000).utc().toDate();

			let newEvent = {
				type: 'traveled',
				context: 'Rode Rideshare',
				datetime: datetime,
				identifier: this.connection._id.toString('hex') + ':::rode:::uber:::' + item.request_id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'uber',
				user_id: this.connection.user_id
			};

			let newLocation = {
				identifier: this.connection._id.toString('hex') + ':::uber:::' + datetime,
				datetime: datetime,
				estimated: false,
				geo_format: 'lat_lng',
				geolocation: [item.start_city.longitude, item.start_city.latitude],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				user_id: this.connection.user_id
			};

			locations.push(newLocation);

			newEvent.location = newLocation;

			events[i] = newEvent;
		}

		return mongoTools.mongoInsert({
			events: events,
			locations: locations
		}, db);
	}
	else {
		return Promise.resolve(null);
	}
};
