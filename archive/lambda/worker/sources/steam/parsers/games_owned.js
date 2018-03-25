'use strict';

const mongoTools = require('../../../util/mongo-tools');


module.exports = function(data, db) {
	var content, events;

	content = new Array(data.length);
	events = new Array(data.length);

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let newGame = {
				identifier: this.connection._id.toString('hex') + ':::steam:::' + item.appid,
				connection: this.connection._id,
				user_id: this.connection.user_id,
				type: 'game',
				embed_thumbnail: item.logo,
				title: item.name,
				url: item.url,
				remote_id: item.appid
			};

			content[i] = newGame;

			let newEvent = {
				type: 'purchased',
				provider_name: 'steam',
				identifier: this.connection._id.toString('hex') + ':::purchased:::steam:::' + item.appid,
				content: [newGame],
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
