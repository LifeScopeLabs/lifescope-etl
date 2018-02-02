'use strict';

const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


module.exports = function(data, db) {
	var content, events;

	content = new Array(data.length);
	events = new Array(data.length);

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let newTrack = {
				identifier: this.connection._id.toString('hex') + ':::spotify:::' + item.track.id,
				connection: this.connection._id,
				user_id: this.connection.user_id,
				url: item.track.external_urls.spotify,
				title: item.track.name,
				remote_id: item.track.id,
				type: 'audio',
				embed_format: 'iframe',
				embed_content: item.oembed.html,
				embed_thumbnail: item.oembed.thumbnail_url
			};

			content[i] = newTrack;

			let newEvent = {
				type: 'played',
				context: 'Saved track',
				provider_name: 'spotify',
				identifier: this.connection._id.toString('hex') + ':::played:::spotify:::' + item.track.id,
				datetime: moment(new Date(item.added_at)).utc().toDate(),
				content: [newTrack],
				connection: this.connection._id,
				user_id: this.connection.user_id
			};

			events[i] = newEvent;
		}

		return mongoTools.mongoInsert({
			content: content,
			events: events
		}, db);
	}
	else {
		return Promise.resolve(null);
	}
};
