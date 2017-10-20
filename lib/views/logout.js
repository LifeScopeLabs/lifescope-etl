'use strict';

const config = require('config');
const express = require('express');

const sessions = require('../sessions');

let router = express.Router();
let logout = router.route('/');

let domain = config.domain;


logout.get(function(req, res, next) {
	sessions.remove(req)
		.then(function() {
			res.clearCookie(config.sessions.cookieName, {
				domain: domain,
				httpOnly: true
			});

			res.redirect('https://' + domain);
		})
		.catch(function(err) {
			next(err);
		});
});

module.exports = router;
