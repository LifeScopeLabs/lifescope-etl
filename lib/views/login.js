'use strict';

const BitScoop = require('bitscoop-sdk');
const config = require('config');
const express = require('express');
const moment = require('moment');

const gid = require('../util/gid');

let router = express.Router();
let login = router.route('/');

let domain = config.domain;
let bitscoop = new BitScoop(config.api.key, {
	allowUnauthorized: true
});


//login.get(function(req, res, next) {
//    // TODO - update login.html
//    res.render('login.html', {
//        page_name: 'login',
//        mode: 'login'
//    });
//});

login.get(function(req, res, next) {
	let cookieName;
	let mongo = env.databases.mongo;
	let service = req.query.service;

	return Promise.resolve()
		.then(function() {
			let mapId;

			switch (service) {
				case 'github':
					mapId = config.login.github.id;
					cookieName = 'github_assoc';
					break;

				case 'google':
					mapId = config.login.google.id;
					cookieName = 'google_assoc';
					break;

				case 'twitter':
					mapId = config.login.twitter.id;
					cookieName = 'twitter_assoc';
					break;

				default:
					return Promise.reject(new Error('You must specify a valid service to login with.'));
			}

			return bitscoop.createConnection(mapId, {
				redirect_url: 'https://' + domain + '/complete?type=login&service=' + service
			});
		})
		.then(function(result) {
			let connectionId = result.id;
			let redirectUrl = result.redirectUrl;

			let token = gid();
			let expiration = moment.utc().add(30, 'seconds').toDate();

			return mongo.db('live').collection('association_sessions').insert({
				_id: gid(),
				token: token,
				connection_id: gid(connectionId),
				ttl: expiration
			})
				.then(function() {
					res.cookie(cookieName, token.toString('hex'), {
						domain: domain,
						secure: true,
						httpOnly: true,
						expires: expiration
					});

					res.redirect(redirectUrl);
				})
		})
		.catch(function(err) {
			next(err);
		});
});

module.exports = router;
