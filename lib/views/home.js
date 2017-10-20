'use strict';

const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const config = require('config');
const express = require('express');
const moment = require('moment');

let router = express.Router();
let home = router.route('/');


let bitscoop = new BitScoop(config.api.key, {
	allowUnauthorized: true
});


home.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

home.get(function(req, res, next) {
	if (req.user == null) {
		res.render('home.html', {
			page_name: 'home',
			mode: 'login'
		});
	}
	else {
		let mongo = env.databases.mongo;

		Promise.all([
			mongo.db('live').collection('connections').find({
				user_id: req.user._id
			}).toArray()
				.then(function(connections) {
					let promises = _.map(connections, function(connection) {
						return bitscoop.getConnection(connection.remote_connection_id.toString('hex'))
							.then(function(remoteConnection) {
								let merged = _.assign(remoteConnection, connection);

								return Promise.resolve(merged);
							});
					});

					return Promise.all(promises);
				})
				.then(function(connections) {
					let completedConnections = _.filter(connections, function(connection) {
						return connection.auth.status.complete === true;
					});

					return Promise.resolve(completedConnections.length);
				}),

			mongo.db('live').collection('events').find({
				user_id: req.user._id
			}).count(),

			mongo.db('live').collection('searches').find({
				user_id: req.user._id
			}).count()
		])
			.then(function(result) {
				let [connectionCount, eventCount, searchCount] = result;

				res.render('home.html', {
					counts: {
						connections: connectionCount,
						events: eventCount,
						searches: searchCount
					},
					page_name: 'home',
					mode: 'home'
				});
			})
			.catch(function(err) {
				next(err);
			});
	}
});


module.exports = router;
