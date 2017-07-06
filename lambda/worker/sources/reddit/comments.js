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

	content = [];
	tags = [];
	events = new Array(data.length);

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];
			let localContent = [];

			let newMessage = {
				identifier: this.connection._id.toString('hex') + ':::reddit:::' + item.data.name,
				connection: this.connection._id,
				user_id: this.connection.user_id,
				type: 'text',
				remote_id: item.data.name,
				title: item.data.link_title,
				embed_content: item.oembed.html,
				embed_format: 'iframe'
			};

			if (item.data.body) {
				newMessage.text = item.data.body;
			}
			else if (item.data.selftext) {
				newMessage.text = item.data.selftext;
			}

			if (item.data.link_title) {
				newMessage.title = item.data.link_title;
			}
			else if (item.data.title) {
				newMessage.title = item.data.title;
			}

			if (item.data.link_url) {
				newMessage.url = item.data.link_url + item.data.id;
			}
			else {
				newMessage.url = 'https://www.reddit.com' + item.data.permalink + item.data.id;
			}

			if (item.data.thumbnail && (/https:\/\//.test(item.data.thumbnail)) || /http:\/\//.test(item.data.thumbnail)) {
				newMessage.embed_thumbnail = item.data.thumbnail;
			}

			let newTags = [];
			let titleTags = newMessage.title.match(tagRegex);

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

			if (newMessage.text) {
				let messageTags = newMessage.text.match(tagRegex);

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

				newMessage['tagMasks.source'] = newTags;
			}

			localContent.push(newMessage);
			content.push(newMessage);

			if (item.data.secure_media && item.data.secure_media.oembed) {
				let oembed = item.data.secure_media.oembed;
				let newContent = {};

				newContent = {
					identifier: this.connection._id.toString('hex') + ':::' + oembed.provider_name.toLowerCase() + ':::' + item.data.url,
					connection: this.connection._id,
					user_id: this.connection.user_id,
					remote_id: oembed.url,
					embed_content: oembed.html.replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
					embed_format: 'iframe',
					embed_thumbnail: oembed.thumbnail_url,
					title: oembed.title,
					type: oembed.type
				};

				localContent.push(newContent);
				content.push(newContent);
			}

			let newEvent = {
				type: 'messaged',
				context: 'Posted',
				provider_name: 'reddit',
				identifier: this.connection._id.toString('hex') + ':::messaged:::reddit:::' + item.data.name,
				datetime: moment(item.data.created_utc * 1000).utc().toDate(),
				content: [newMessage],
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
