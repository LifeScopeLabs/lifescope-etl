'use strict';

const express = require('express');


let router = express.Router();


router.use('/api', require('./api'));
router.use('/complete', require('./complete'));
router.use('/connections', require('./connections'));
router.use('/explore', require('./explore'));
router.use('/login', require('./login'));
router.use('/logout', require('./logout'));
router.use('/providers', require('./providers'));
router.use('/settings', require('./settings'));
router.use('/signup', require('./signup'));
router.use('/start', require('./start'));

router.use('/health', function(req, res, next) {
	res.sendStatus(204);
});

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
	router.use('/errors', require('./errors'));
}

router.use('/$', require('./home'));


module.exports = router;
