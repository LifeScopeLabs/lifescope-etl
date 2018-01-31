'use strict';

const _ = require('lodash');
const express = require('express');

const deleteConnection = require('../../util/delete-connection');
const loginRequired = require('../../middleware/login-required');

let router = express.Router();

let account = router.route('/');


account.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS,DELETE');

	res.sendStatus(204);
});

account.get(loginRequired(404), function(req, res, next) {
	res.render('settings/account.html', {
		title: 'Account Settings',
		settings_type: 'Account',
		mode: 'home',
		page_name: 'settings account',
		hide_advanced: true
	});
});

// Need to allow access for logged in and logged out users.
// Remove csrf.validate
account.delete(function(req, res, next) {
	let mongo = env.databases.mongo;

	return mongo.db('live').collection('connections').find({
		user_id: req.user._id
	}).toArray()
		.then(function(connections) {
			let promises = _.map(connections, function(connection) {
				return deleteConnection(connection._id.toString('hex'), req.user._id);
			});

			return Promise.all(promises);
		})
		.then(function() {
			return mongo.db('live').collection('users').deleteOne({
				_id: req.user._id
			});
		})
		.then(function() {
			res.sendStatus(204);
		})
		.catch(function(err) {
			next(err);
		});
});


module.exports = router;
