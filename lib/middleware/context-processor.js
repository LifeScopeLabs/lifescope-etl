'use strict';

const _ = require('lodash');
const express = require('express');
const moment = require('moment');


let baseRender = express.response.render;


function render(template, context, callback) {
	let ctx = {};

	_.assign(ctx, this.context, context);

	return baseRender.call(this, template, ctx, callback);
}


if (baseRender !== render) {
	express.response.render = render;
}


module.exports = function(req, res, next) {
	res.context = {
		req: req,
		now: moment.utc().toDate()
	};

	next();
};
