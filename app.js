'use strict';

const Promise = require('bluebird');
const URL = require('url-parse');
const bristolConf = require('bristol-config');
const config = require('config');
const express = require('express');
const mongodb = require('mongodb');
const nunjucks = require('nunjucks');
const staticfiles = require('nunjucks-staticfiles');

const validator = require('./lib/validator');


let app = express();
let logger = bristolConf(config.logging);

let renderer = nunjucks.configure(config.templates.directory, {
	autoescape: true,
	express: app
});

renderer.addFilter('date', require('nunjucks-date-filter'));
renderer.addFilter('hex', require('./lib/filters/hex'));
renderer.addFilter('is_before', require('./lib/filters/is-before'));
renderer.addFilter('relative_time', require('./lib/filters/relative-time'));
renderer.addFilter('slugify', require('./lib/filters/slugify'));

staticfiles.configure(config.staticfiles.directories, {
	nunjucks: renderer,
	express: app,
	path: config.staticfiles.path,
	staticMiddleware: express.static
});

// Disable insecure header information.
app.disable('x-powered-by');

// Allos Express to determine ip from series of proxies
app.enable('trust proxy');

// Mount middleware.
app.use([
	// Add tracking/diagnostic metadata to the request.
	require('./lib/middleware/meta'),

	// Context processor
	require('./lib/middleware/context-processor'),

	// Parse cookies.
	require('cookie-parser')(),

	// Body parsing (convert stream to completed buffer)
	require('body-parser').json({
		limit: 2500000 // bytes (2.5MB)
	}),

	// Body parsing for HTML forms (convert stream to completed buffer)
	require('body-parser').urlencoded({
		extended: false,
		limit: 2500000 // bytes (2.5MB)
	}),

	// Request logging
	require('./lib/middleware/logging')(logger),

	// Load the current user onto the request
	require('./lib/middleware/authentication'),

	// CSRF middleware
	require('./lib/middleware/csrf').create,

	// Create initial searches
	require('./lib/middleware/initial-searches'),

	// Mount main views
	require('./lib/views'),

	// Send a 404 if the route is not otherwise handled.
	require('./lib/middleware/handle-404'),

	// Send an error code corresponding to a handled application error.
	require('./lib/middleware/handle-error')
]);


// SHUTDOWN
(function(process) {
	function shutdown(code) {
		process.exit(code || 0);
	}

	process.once('SIGINT', function() {
		logger.info('Gracefully shutting down from SIGINT (CTRL+C)');
		shutdown(0);
	});

	process.once('SIGTERM', function() {
		shutdown(0);
	});
})(process);


// BOOT
Promise.all([
	new Promise(function(resolve, reject) {
		let address = config.databases.mongo.address;
		let options = config.databases.mongo.options;

		mongodb.MongoClient.connect(address, options, function(err, db) {
			if (err) {
				reject(err);
			}
			else {
				resolve(db);
			}
		});
	}),

	validator.load(config.validationSchemas)
])
	.then(function(result) {
		let [mongo, validate] = result;

		global.env = {
			databases: {
				mongo: mongo
			},

			logger: logger,
			validate: validate
		};
	})
	.then(function() {
		return Promise.all([
			new Promise(function(resolve, reject) {
				let url = new URL(config.address);
				let hostname = (url.hostname === '0.0.0.0' || url.hostname === '') ? '*' : url.hostname;
				let port = parseInt(url.port);

				let server = (hostname === '*') ? app.listen(port) : app.listen(port, hostname);

				server.once('listening', function() {
					resolve(server);
				});

				server.once('error', reject);
			})
		]);
	})
	.then(function(result) {
		let [http] = result;

		logger.info('HTTP server listening.', http.address());
	})
	.catch(function(err) {
		logger.error(err);
		process.exit(1);
	});


process.stdin.resume();
