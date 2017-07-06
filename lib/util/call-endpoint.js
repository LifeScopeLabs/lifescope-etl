'use strict';

const url = require('url');

const config = require('config');
const httpErrors = require('http-errors');
const request = require('request');


function call(providerId, connectionId, endpoint, method, body) {
	return new Promise(function(resolve, reject) {
		let href = url.format({
			protocol: config.api.address.protocol,
			hostname: config.api.address.hostname,
			port: config.api.address.port,
			pathname: providerId + '/' + endpoint
		});

		let options = {
			url: href,
			method: method.toUpperCase(),
			headers: {
				authorization: 'Bearer ' + config.api.key,
				host: config.api.address.host_header.subdomain,
				'X-Connection-Id': connectionId
			},
			json: true,
			followAllRedirects: true
		};

		if (body) {
			options.body = body;
		}

		request(options, function(error, response, body) {
			if (error) {
				reject(error);
			}
			else if (response.statusCode >= 400) {
				reject(httpErrors(response.statusCode));
			}
			else {
				resolve(body);
			}
		});
	});
}


module.exports = call;
