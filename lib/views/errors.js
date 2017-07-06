'use strict';

const express = require('express');
const httpErrors = require('http-errors');


let errors = [400, 401, 403, 404, 500];
let router = express.Router();


for (let i = 0; i < errors.length; i++) {
	let code = errors[i];
	let route = router.route('/' + code);

	route.options(function(req, res, next) {
		res.setHeader('Allowed', 'GET,OPTIONS');

		res.sendStatus(204);
	});

	route.get(function(req, res, next) {
		next(httpErrors(code));
	});
}


module.exports = router;


