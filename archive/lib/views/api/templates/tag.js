'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const httpErrors = require('http-errors');
const moment = require('moment');

const gid = require('../../../util/gid');


function add(req, type) {
	let hexId = req.params.id;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			let promises = _.map(req.body.tags, function(tag) {
				return mongo.db('live').collection('tags').update({
					tag: tag,
					user_id: req.user._id
				}, {
					$set: {
						updated: moment.utc().toDate()
					},
					$setOnInsert: {
						_id: gid(),
						created: moment.utc().toDate(),
						tag: tag
					}
				}, {
					upsert: true
				});
			});

			return Promise.all(promises);
		})
		.then(function() {
			let filter = {
				_id: gid(hexId),
				user_id: req.user._id
			};

			return mongo.db('live').collection(type).updateOne(filter, {
				$addToSet: {
					'tagMasks.added': {
						$each: req.body.tags
					}
				},
				$pull: {
					'tagMasks.removed': {
						$in: req.body.tags
					}
				}
			})
				.then(function(data) {
					if (data.result.n === 0) {
						return Promise.reject(httpErrors(404));
					}

					return mongo.db('live').collection(type).findOne(filter);
				});
		});
}

function addEsTags(document, type, hexId) {
	let elastic = env.databases.elastic;
	let tags = document.tagMasks.source ? _.cloneDeep(document.tagMasks.source) : [];

	_.forEach(document.tagMasks.added, function(tag) {
		if (tags.indexOf(tag) === -1) {
			tags.push(tag);
		}
	});

	_.forEach(document.tagMasks.removed, function(tag) {
		let index = tags.indexOf(tag);

		if (index > -1) {
			tags.splice(index, 1);
		}
	});

	let esDocument = _.omit(document, ['_id', 'tagMasks']);
	esDocument.tags = tags;
	esDocument.user_id = esDocument.user_id.toString('hex');

	return elastic.index({
		index: 'explorer',
		type: type,
		id: hexId,
		body: esDocument
	})
		.catch(function(err) {
			// TODO: Queue a job to clean up the search index.
			env.logger.error(err);
		})
		.then(function() {
			return Promise.resolve();
		});
}

function hydrateEvent(document, userId) {
	let subtypes = ['contacts', 'content', 'locations', 'things'];
	let esEvent = _.omit(document, '_id');
	let mongo = env.databases.mongo;

	let promises = _.map(subtypes, function(type) {
		if (type === 'locations' && document.location) {
			return mongo.db('live').collection(type).findOne({
				_id: document.location,
				user_id: userId
			})
				.then(function(subDocument) {
					if (subDocument) {
						esEvent.location = null;

						let subObject = _.omit(subDocument, ['_id', 'tagMasks']);

						// If the location has tagMasks, then amalgamate the masks into a single list of tags.
						if (subDocument.tagMasks) {
							let tags = subDocument.tagMasks.source ? subDocument.tagMasks.source : [];

							_.forEach(subDocument.tagMasks.added, function(tag) {
								if (tags.indexOf(tag) === -1) {
									tags.push(tag);
								}
							});

							_.forEach(subDocument.tagMasks.removed, function(tag) {
								let index = tags.indexOf(tag);

								if (index > -1) {
									tags.splice(index, 1);
								}
							});

							subObject.tags = tags;
						}

						esEvent.location = subObject;
					}

					return Promise.resolve(null);
				});
		}
		else if (document[type] && document[type].length > 0) {
			return mongo.db('live').collection(type).find({
				_id: {
					$in: document[type]
				},
				user_id: userId
			}).toArray()
				.then(function(subDocuments) {
					if (subDocuments && subDocuments.length > 0) {
						esEvent[type] = [];

						_.forEach(subDocuments, function(subDocument, i) {
							let subObject = _.omit(subDocument, ['_id', 'tagMasks']);

							// If the location has tagMasks, then amalgamate the masks into a single list of tags.
							if (subDocument.tagMasks) {
								let tags = subDocument.tagMasks.source ? subDocument.tagMasks.source : [];

								_.forEach(subDocument.tagMasks.added, function(tag) {
									if (tags.indexOf(tag) === -1) {
										tags.push(tag);
									}
								});

								_.forEach(subDocument.tagMasks.removed, function(tag) {
									let index = tags.indexOf(tag);

									if (index > -1) {
										tags.splice(index, 1);
									}
								});

								subObject.tags = tags;
							}

							esEvent[type].push(subObject);
						});
					}

					return Promise.resolve(null);
				});
		}
		else {
			return Promise.resolve(null);
		}
	});

	return Promise.all(promises).then(function() {
		return Promise.resolve(esEvent);
	});
}


function remove(req, type) {
	let hexId = req.params.id;
	let mongo = env.databases.mongo;
	let validate = env.validate;

	return validate('#/types/uuid4', hexId)
		.catch(function() {
			return Promise.reject(httpErrors(404));
		})
		.then(function() {
			let promises = _.map(req.body.tags, function(tag) {
				return mongo.db('live').collection('tags').update({
					tag: tag,
					user_id: req.user._id
				}, {
					$set: {
						updated: moment.utc().toDate()
					},
					$setOnInsert: {
						_id: gid(),
						created: moment.utc().toDate(),
						tag: tag
					}
				}, {
					upsert: true
				});
			});

			return Promise.all(promises);
		})
		.then(function() {
			let filter = {
				_id: gid(hexId),
				user_id: req.user._id
			};

			return mongo.db('live').collection(type).updateOne(filter, {
				$addToSet: {
					'tagMasks.removed': {
						$each: req.body.tags
					}
				},
				$pull: {
					'tagMasks.added': {
						$in: req.body.tags
					}
				}
			})
				.then(function(data) {
					if (data.result.n === 0) {
						return Promise.reject(httpErrors(404));
					}

					return mongo.db('live').collection(type).findOne(filter);
				});
		});
}

function tagEvents(req, type) {
	let hexId = req.params.id;
	let elastic = env.databases.elastic;
	let mongo = env.databases.mongo;

	// First, return the events that contain the object that has been tagged
	return mongo.db('live').collection('events').find({
		[type]: gid(hexId),
		user_id: req.user._id
	}).toArray()
		.then(function(documents) {
			// Next, we need to update the ES copy of each event separately.
			let promises = _.map(documents, function(document) {
				let eventHexId = document._id.toString('hex');

				return hydrateEvent(document, req.user._id)
					.then(function(esEvent) {
						esEvent.user_id = esEvent.user_id.toString('hex');
						return elastic.index({
							index: 'explorer',
							type: 'events',
							id: eventHexId,
							body: esEvent
						})
							.catch(function(err) {
								// TODO: Queue a job to clean up the search index.
								env.logger.error(err);
							});
					});
			});

			return Promise.all(promises);
		});
}


module.exports = {
	add: add,
	addEsTags: addEsTags,
	remove: remove,
	tagEvents: tagEvents
};
