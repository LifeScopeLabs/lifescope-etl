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

			let newAlbum = {
				identifier: this.connection._id.toString('hex') + ':::spotify:::' + item.album.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'spotify',
				user_id: this.connection.user_id,
				url: item.album.external_urls.spotify,
				title: item.album.name,
				remote_id: item.album.id,
				type: 'audio',
				embed_format: 'iframe',
				embed_content: item.oembed.html,
				embed_thumbnail: item.oembed.thumbnail_url
			};

			content[i] = newAlbum;

			let newEvent = {
				type: 'played',
				context: 'Saved album',
				identifier: this.connection._id.toString('hex') + ':::played:::spotify:::' + item.album.id,
				datetime: moment(new Date(item.added_at)).utc().toDate(),
				content: [newAlbum],
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				provider_name: 'spotify',
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
