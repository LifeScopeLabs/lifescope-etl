'use strict';

const BitScoop = require('bitscoop-sdk');
const Promise = require('bluebird');
const _ = require('lodash');
const config = require('config');
const httpErrors = require('http-errors');

const callApi = require('./call-api');
const gid = require('./gid');

let bitscoop = new BitScoop(config.api.key, {
	allowUnauthorized: true
});


let types = [
	'contacts',
	'content',
	'events',
	'locations',
	'organizations',
	'places',
	'things'
];


function deleteConnection(hexId, userId) {
	let mongo = env.databases.mongo;
	let connectionId;

	return mongo.db('live').collection('connections').findOne({
		_id: gid(hexId)
	})
		.then(function(connection) {
			if (!connection) {
				return Promise.reject(httpErrors(404));
			}

			connectionId = connection.remote_connection_id;

			return mongo.db('live').collection('connections').deleteOne({
				_id: gid(hexId)
			});
		})
		.then(function() {
			return bitscoop.deleteConnection(connectionId.toString('hex'));
		})
		.then(function() {
			let terms = {
				user_id: userId,
				connection_id: gid(hexId)
			};

			let promises = _.map(types, function(type) {
				return mongo.db('live').collection(type).remove(terms);
			});

			return Promise.all(promises)
				.then(function() {
					return Promise.resolve(null);
				});
		});
}


module.exports = deleteConnection;
