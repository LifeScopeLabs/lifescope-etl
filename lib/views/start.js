'use strict';

const express = require('express');


let router = express.Router();
let start = router.route('/');


start.options(function(req, res, next) {
	res.setHeader('Allowed', 'GET,OPTIONS');

	res.sendStatus(204);
});

start.get(function(req, res, next) {
	res.context.page_name = 'start';

	res.render('start.html', {
		title: 'Welcome to BitScoop',
		mode: 'connection'
	});
});


module.exports = router;
