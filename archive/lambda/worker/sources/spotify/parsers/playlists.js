'use strict';

const _ = require('lodash');

const mongoTools = require('../../../util/mongo-tools');


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
			let newTags = [];

			let titleTags = item.name.match(tagRegex);

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

			let newPlaylist = {
				identifier: this.connection._id.toString('hex') + ':::spotify:::' + item.id,
				connection: this.connection._id,
				user_id: this.connection.user_id,
				url: item.external_urls.spotify,
				title: item.name,
				remote_id: item.id,
				'tagMasks.source': newTags,
				type: 'audio',
				embed_format: 'iframe',
				embed_content: item.oembed.html,
				embed_thumbnail: item.oembed.thumbnail_url
			};

			content[i] = newPlaylist;

			let newEvent = {
				type: 'created',
				context: 'Playlist',
				provider_name: 'spotify',
				identifier: this.connection._id.toString('hex') + ':::created:::spotify:::' + item.id,
				content: [newPlaylist],
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
