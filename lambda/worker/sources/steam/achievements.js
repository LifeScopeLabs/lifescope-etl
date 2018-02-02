'use strict';

const _ = require('lodash');

const mongoTools = require('../../../util/mongo-tools');


module.exports = function(data, db) {
	var content, events, objectCache;

	objectCache = {
		content: {},
		events: {}
	};

	content = [];
	events = [];

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			for (let j = 0; j < item.achievements.length; j++) {
				let achievement = item.achievements[j];

				let newAchievement = {
					identifier: this.connection._id.toString('hex') + ':::steam:::' + item.appid + ':::' + achievement.schema.name,
					connection: this.connection._id,
					user_id: this.connection.user_id,
					type: 'achievement',
					embed_thumbnail: achievement.schema.icon,
					title: achievement.schema.displayName,
					text: achievement.schema.description,
					remote_id: item.appid + '/' + achievement.schema.name
				};

				if (!_.has(objectCache.content, newAchievement.identifier)) {
					objectCache.content[newAchievement.identifier] = newAchievement;

					content.push(objectCache.content[newAchievement.identifier]);
				}

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

				if (!_.has(objectCache.content, newGame.identifier)) {
					objectCache.content[newGame.identifier] = newGame;

					content.push(objectCache.content[newGame.identifier]);
				}

				let newEvent = {
					type: 'played',
					context: 'Earned achievement',
					provider_name: 'steam',
					identifier: this.connection._id.toString('hex') + ':::played:::steam:::' + item.appid + ':::' + achievement.schema.name,
					content: [objectCache.content[newAchievement.identifier], objectCache.content[newGame.identifier]],
					connection: this.connection._id,
					user_id: this.connection.user_id
				};

				events.push(newEvent);
			}
		}

		if (events.length > 0) {
			return mongoTools.mongoInsert({
				content: content,
				events: events
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
