'use strict';

const config = require('config');
const express = require('express');

const sessions = require('../sessions');

let router = express.Router();
let logout = router.route('/');

//logout.get(function(req, res, next) {
//	// TODO - update logout.html
//	res.render('logout.html', {
//		page_name: 'logout',
//		mode: 'logout'
//	});
//});

logout.get(function(req, res, next) {
	sessions.remove(req)
		.then(function() {
			res.clearCookie(config.sessions.cookieName, {
				domain: config.domain,
				httpOnly: true
			});

			res.redirect('http://' + config.domain);
		})
		.catch(function(err) {
			next(err);
		});
});

module.exports = router;
