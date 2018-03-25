'use strict';

const express = require('express');

const loginRequired = require('../middleware/login-required');


const router = express.Router();
const explore = router.route('/');


explore.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

explore.get(loginRequired(404), function(req, res, next) {
	res.context.page_name = 'explorer';

	res.render('explore.html', {
		title: 'Explore',
		mode: 'app'
	});
});


module.exports = router;
