'use strict';

const express = require('express');


let router = express.Router();


router.use('/connections', require('./api/connections'));
router.use('/providers', require('./api/providers'));
router.use('/searches', require('./api/searches'));

// Object API Endpoints
router.use('/contacts', require('./api/contacts'));
router.use('/content', require('./api/content'));
router.use('/events', require('./api/events'));
//router.use('/locations', require('./api/locations'));
//router.use('/organizations', require('./api/organizations'));
//router.use('/places', require('./api/places'));
//router.use('/things', require('./api/things'));
router.use('/tags', require('./api/tags'));


module.exports = router;
