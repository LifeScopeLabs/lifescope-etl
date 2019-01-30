'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');



module.exports = function(data, db) {
	let events = [];
	let contacts = [];
	let locations = [];

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			if (item.status !== 'canceled') {
				let startDatetime = moment(item.pickup.time).utc().toDate();

				let startEvent = {
					type: 'traveled',
					context: 'Rode Rideshare',
					datetime: startDatetime,
					identifier: this.connection._id.toString('hex') + ':::rode:::lyft:::' + item.ride_id,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'lyft',
					user_id: this.connection.user_id
				};

				let startLocation = {
					identifier: this.connection._id.toString('hex') + ':::lyft:::' + startDatetime,
					datetime: startDatetime,
					estimated: false,
					geo_format: 'lat_lng',
					geolocation: [item.pickup.lng, item.pickup.lat],
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					user_id: this.connection.user_id
				};

				locations.push(startLocation);

				startEvent.location = startLocation;

				events.push(startEvent);

				let endDatetime = moment(item.dropoff.time).utc().toDate();

				let endEvent = {
					type: 'traveled',
					context: 'Finished Rideshare',
					datetime: endDatetime,
					identifier: this.connection._id.toString('hex') + ':::finished:::lyft:::' + item.ride_id,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'lyft',
					user_id: this.connection.user_id
				};

				let endLocation = {
					identifier: this.connection._id.toString('hex') + ':::lyft:::' + endDatetime,
					datetime: endDatetime,
					estimated: false,
					geo_format: 'lat_lng',
					geolocation: [item.dropoff.lng, item.dropoff.lat],
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					user_id: this.connection.user_id
				};

				locations.push(endLocation);

				startEvent.location = endLocation;

				events.push(endEvent);
			}
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
