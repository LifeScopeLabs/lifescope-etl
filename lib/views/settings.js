'use strict';

const express = require('express');


let router = express.Router();


router.use('/account', require('./settings/account'));
router.use('/connections', require('./settings/connections'));

router.use('/$', function(req, res, next) {
	res.redirect('/settings/connections');
});


module.exports = router;
