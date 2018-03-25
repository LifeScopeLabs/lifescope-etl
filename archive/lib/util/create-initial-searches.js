'use strict';

const Promise = require('bluebird');
const crypto = require('crypto');
const _ = require('lodash');
const moment = require('moment');

const fs = require('./fs');
const gid = require('./gid');
const sortDictionary = require('./sort-dictionary');


let initialSearches = fs.readfile('fixtures/searches/initial_searches.json');


function createInitialSearches(userId) {
	let mongo = env.databases.mongo;

	return initialSearches
		.then(function(data) {
			let searches = JSON.parse(data);

			let promises = _.map(searches, function(search) {
				let unnamedFilters = _.map(search.filters, function(filter) {
					return _.omit(filter, 'name');
				});

				let hashObj = {
					filters: unnamedFilters
				};

				if (search.query != null) {
					hashObj.query = search.query;
				}

				let sorted = sortDictionary(hashObj);
				let hash = crypto.createHash('sha512').update(sorted).digest('hex');

				return mongo.db('live').collection('searches').update({
					hash: hash,
					user_id: userId
				}, {
					$setOnInsert: {
						_id: gid(),
						count: 1,
						last_run: moment.utc().toDate(),
						filters: search.filters,
						hash: hash,
						user_id: userId,
						favorited: search.favorited,
						icon: search.icon,
						icon_color: search.icon_color,
						query: search.query,
						name: search.name
					}
				}, {
					upsert: true
				});
			});

			return Promise.all(promises);
		})
		.then(function() {
			return mongo.db('live').collection('users').update({
				_id: userId
			}, {
				$set: {
					'settings.explorer.initial_searches': true
				}
			});
		});
}


module.exports = createInitialSearches;
