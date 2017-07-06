'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../util/mongo-tools');

let tagRegex = /#[^#\s]+/g;


module.exports = function(data, db) {
	var content, events, objectCache, tags;
	objectCache = {
		tags: {}
	};

	content = new Array(data.length);
	tags = [];
	events = new Array(data.length);

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let newThread = {
				identifier: this.connection._id.toString('hex') + ':::reddit:::' + item.data.name,
				connection: this.connection._id,
				user_id: this.connection.user_id,
				type: 'text',
				text: item.data.selftext,
				url: 'https://www.reddit.com' + item.data.permalink,
				remote_id: item.data.id,
				title: item.data.title
			};

			if (item.data.thumbnail) {
				newThread.thumbnail = item.data.thumbnail;
			}

			let newTags = [];
			let titleTags = newThread.title.match(tagRegex);

			if (titleTags != null) {
				for (let j = 0; j < titleTags.length; j++) {
					let tag = titleTags[j].slice(1);

					let newTag = {
						tag: tag,
						user_id: this.connection.user_id
					};

					if (!_.has(objectCache.tags, newTag.tag)) {
						objectCache.tags[newTag.tag] = newTag;

						tags.push(objectCache.tags[newTag.tag]);
					}

					if (newTags.indexOf(newTag.tag) === -1) {
						newTags.push(newTag.tag);
					}
				}
			}

			if (newThread.text) {
				let messageTags = newThread.text.match(tagRegex);

				if (messageTags != null) {
					for (let j = 0; j < messageTags.length; j++) {
						let tag = messageTags[j].slice(1);

						let newTag = {
							tag: tag,
							user_id: this.connection.user_id
						};
						if (!_.has(objectCache.tags, newTag.tag)) {
							objectCache.tags[newTag.tag] = newTag;

							tags.push(objectCache.tags[newTag.tag]);
						}

						if (newTags.indexOf(newTag.tag) === -1) {
							newTags.push(newTag.tag);
						}
					}
				}

				newThread['tagMasks.source'] = newTags;
			}

			content[i] = newThread;

			let newEvent = {
				type: 'created',
				context: 'Created thread',
				provider_name: 'reddit',
				identifier: this.connection._id.toString('hex') + ':::created:::reddit:::' + item.data.name,
				datetime: moment(item.data.created_utc * 1000).utc().toDate(),
				content: [newThread],
				connection: this.connection._id,
				user_id: this.connection.user_id
			};

			events[i] = newEvent;
		}

		return mongoTools.mongoInsert({
			content: content,
			events: events,
			tags: tags
		}, db);
	}
	else {
		return Promise.resolve(null);
	}
};
