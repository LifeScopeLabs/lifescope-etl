'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


let tagRegex = /#[^#\s]+/g;


module.exports = function(data, db) {
	var content, events, objectCache, tags;

	objectCache = {
		tags: {}
	};

	content = [];
	events = [];
	tags = [];

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			if (item['tag'] !== 'folder') {
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

				let newFile = {
					identifier: this.connection._id.toString('hex') + ':::dropbox:::' + item.id,
					remote_id: item.id,
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					provider_name: 'dropbox',
					tagMasks: {
						source: newTags
					},
					title: item.name,
					user_id: this.connection.user_id
				};

				let url = 'https://dropbox.com/home';
				let path_split = item.path_lower.split('/');

				for (let j = 1; j < path_split.length - 1; j++) {
					url += '/' + path_split[j];
				}

				newFile.url = url + '?preview=' + path_split[path_split.length - 1];

				path_split = item.path_lower.split('.');

				if (path_split.length > 1) {
					newFile.mimeType = path_split[path_split.length - 1];
				}

				if (item.media_info) {
					let metadata = item.media_info.metadata;

					newFile.embedded_format = path_split[path_split.length - 1];

					if (metadata['tag'] === 'photo') {
						newFile.type = 'image';
					}
					else if (metadata['tag'] === 'video') {
						newFile.type = 'video';
					}
				}
				else {
					newFile.type = 'file';
				}

				content.push(newFile);

				let newEvent = {
					type: 'edited',
					provider_name: 'dropbox',
					identifier: this.connection._id.toString('hex') + ':::edited:::dropbox:::' + item.id,
					content: [newFile],
					connection_id: this.connection._id,
					provider_id: this.connection.provider_id,
					user_id: this.connection.user_id
				};

				if (item.media_info && item.media_info.metadata.time_taken) {
					newEvent.datetime = moment(item.media_info.metadata.time_taken).utc().toDate();
				}
				else {
					newEvent.datetime = moment(item.server_modified).utc().toDate();
				}

				events.push(newEvent);
			}
		}

		return mongoTools.mongoInsert({
			content: content,
			events: events,
			tags: tags
		}, db);
	}
	else {
		return Promise.resolve();
	}
};
