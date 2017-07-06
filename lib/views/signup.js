'use strict';

const BitScoop = require('bitscoop-sdk');
const config = require('config');
const express = require('express');
const moment = require('moment');

const gid = require('../util/gid');

let router = express.Router();
let signup = router.route('/');

let domain = config.domain;
let bitscoop = new BitScoop(config.api.key);


//signup.get(function(req, res, next) {
//	// TODO - update signup.html
//	res.render('signup.html', {
//		page_name: 'signup',
//		mode: 'signup'
//	});
//});

signup.get(function(req, res, next) {
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
					return Promise.reject(new Error('You must specify a valid service to sign up with.'));
			}

			return bitscoop.createConnection(mapId, {
				redirect_url: 'http://' + domain + '/complete?type=signup&service=' + service
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
						domain: config.domain,
						//secure: true,
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
