'use strict';

const path = require('path');

const _ = require('lodash');
const mongodb = require('mongodb');

const fs = require('./util/fs');
const gid = require('./util/gid');


exports.handler = function(event, context, callback) {
	let db;
	
	return Promise.all([
		new Promise(function(resolve, reject) {
<<<<<<< HEAD
			let address = "mongodb://127.0.0.3:27017";
=======
			let address = "mongodb://0.0.0.0:27017";
>>>>>>> 46ff5d673b10ba2cf43595e9b575085d9592a558
			let options = {
				poolSize: 5
			};

			mongodb.MongoClient.connect(address, options, function(err, database) {
				if (err) {
					reject(err);
				}
				else {
					db = database;
					resolve();
				}
			});
		}),

		fs.find('./fixtures/providers/*.json')
	])
		.then(function(result) {
			let [, files] = result;

			return Promise.all([
				// `associations` Collection
				db.db('live').collection('association_sessions').createIndex({
					token: 1
				}, {
					unique: true
				}),

				db.db('live').collection('association_sessions').createIndex({
					connection_id: 1
				}, {
					unique: true
				}),

				db.db('live').collection('association_sessions').createIndex({
					ttl: 1
				}, {
					expireAfterSeconds: 0
				}),

				// `sessions` Collection
				db.db('live').collection('sessions').createIndex({
					created: 1
				}),

				db.db('live').collection('sessions').createIndex({
					expires: 1
				}),

				db.db('live').collection('sessions').createIndex({
					login: 1
				}),

				db.db('live').collection('sessions').createIndex({
					logout: 1
				}),

				db.db('live').collection('sessions').createIndex({
					token: 1
				}, {
					unique: true
				}),

				db.db('live').collection('sessions').createIndex({
					ttl: 1
				}, {
					expireAfterSeconds: 0
				}),

				db.db('live').collection('sessions').createIndex({
					user_id: 1
				}),

				// `users` Collection
				db.db('live').collection('users').createIndex({
					_upper_email: 1
				}, {
					unique: true,
					sparse: true
				}),

				db.db('live').collection('users').createIndex({
					_upper_handle: 1
				}, {
					unique: true,
					sparse: true
				}),

				db.db('live').collection('users').createIndex({
					social_accounts: 1
				}),

				// `connections` collection
				db.db('live').collection('connections').createIndex({
					connection_id: 1
				}),

				db.db('live').collection('connections').createIndex({
					user_id: 1
				}),

				// `events` collection
				db.db('live').collection('events').createIndex({
					type: 'text',
					provider_name: 'text',
					user_id: 1
				}),

				db.db('live').collection('contacts').createIndex({
					handle: 'text',
					name: 'text'
				}),

				db.db('live').collection('content').createIndex({
					type: 'text',
					file_extension: 'text',
					owner: 'text',
					title: 'text',
					text: 'text',
					url: 'text'
				}),

				db.db('live').collection('things').createIndex({
					title: 'text',
					text: 'text'
				}),

				// `providers` collection
				db.db('live').collection('providers').createIndex({
					enabled: 1
				}),

				db.db('live').collection('providers').createIndex({
					provider_id: 1
				}),

				// `tags` collection
				db.db('live').collection('tags').createIndex({
					user_id: 1
				})
			])
				.then(function() {
					return Promise.resolve(files);
				});
		})
		.then(function(files) {
			let inserts = _.map(files, function(file) {
				console.log('Reading Provider information from "' + file + '".');

				return Promise.all([
					fs.readfile(file)
				])
					.then(function(result) {
						let [providerJson] = result;

						let provider = JSON.parse(providerJson);
						if (provider.remote_map_id == null) {
							return Promise.resolve();
						}

						provider._id = gid(provider._id);
						provider.remote_map_id = gid(provider.remote_map_id);

						return db.db('live').collection('providers').update({
							_id: provider._id
						}, {
							$setOnInsert: provider
						}, {
							upsert: true
						})
							.then(function(inserted) {
								console.log('New Provider <' + provider._id.toString('hex') + '> inserted.');

								return Promise.resolve(inserted);
							});
					});
			});

			return Promise.all(inserts);
		})
		.then(function() {
			console.log('Migrations succeeded.');

			db.close();

			callback(null, null);

			return Promise.resolve();
		})
		.catch(function(err) {
			console.log(err);

			if (db) {
				db.close();
			}

			return Promise.reject(err);
		});
};
