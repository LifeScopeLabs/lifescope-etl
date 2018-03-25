'use strict';

const BitScoop = require('bitscoop-sdk');
const _ = require('lodash');
const config = require('config');
const express = require('express');
const moment = require('moment');

const gid = require('../util/gid');

let router = express.Router();
let login = router.route('/');

let domain = config.domain;
let bitscoop = new BitScoop(config.api.key, {
	allowUnauthorized: true
});


login.get(function(req, res, next) {
	let cookieName;
	let mongo = env.databases.mongo;
	let service = req.query.service;

	return Promise.resolve()
		.then(function() {
			let mapId;

			switch (service) {
				case 'github':
					mapId = config.login.github.id;
					cookieName = 'github_assoc';
					break;

				case 'google':
					mapId = config.login.google.id;
					cookieName = 'google_assoc';
					break;

				case 'twitter':
					mapId = config.login.twitter.id;
					cookieName = 'twitter_assoc';
					break;

				default:
					return Promise.reject(new Error('You must specify a valid service to login with.'));
			}

            return Promise.resolve()
                .then(function() {
                    // Fetch provide by remote_map_id
                    return mongo.db('live').collection('providers').findOne({
                        remote_map_id: gid(mapId)
                    })
                        .then(function(provider) {
                            if (!provider) {
                                return Promise.reject(httpErrors(404));
                            }

                            // Fetch map for this provider
                            return bitscoop.getMap(provider.remote_map_id.toString('hex'))
                                .then(function(remoteProvider) {
                                    let merged = _.assign(provider, remoteProvider);

                                    return Promise.resolve(merged);
                                });
                        });

                })
                .then(function(provider) {
                    // Fetch all endpoints from provider
                    let endpoints = [];
                    let connection = {
                        frequency: 1,
                        enabled: true,
                        permissions: {},

                        provider: provider,
                        provider_id: provider._id
                    };

                    _.each(provider.sources, function(source, name) {
                        // Allow for all source mappings
                        connection.permissions[name] = {
                            enabled: true,
                            frequency: 1
                        };

                        endpoints.push(source.mapping);
                    });

                    endpoints = _.uniq(endpoints);

                    let redirect_url = 'https://' + domain + '/complete?type=login&service=' +
                        service + '&map_id=' + provider.remote_map_id.toString('hex')
                    return Promise.all([
                        bitscoop.createConnection(mapId, {
                            // NOTE - name might not be needed
                            name: "",
                            endpoints: endpoints,
                            redirect_url: redirect_url
                        }),
                        Promise.resolve(connection)
                    ]);
            });
		})
		.then(function(result) {
            let [authObj, connection] = result;
			let connectionId = authObj.id;
			let redirectUrl = authObj.redirectUrl;

			let token = gid();
			let expiration = moment.utc().add(300, 'seconds').toDate();

            return Promise.all([
                mongo.db('live').collection('association_sessions').insert({
                    _id: gid(),
                    token: token,
                    connection_id: gid(connectionId),
                    ttl: expiration
                }),
                mongo.db('live').collection('connections').insertOne({
                    _id: gid(),
                    auth: {
                        status: {
                            complete: false
                        }
                    },
                    frequency: 1,
                    enabled: true,
                    permissions: connection.permissions,
                    provider_name: connection.provider.name,
                    provider_id: connection.provider_id,
                    remote_connection_id: gid(authObj.id)
                }),
                Promise.resolve(token),
                Promise.resolve(expiration),
                Promise.resolve(redirectUrl)
            ]);

		})
        .then(function(result) {
            let [sessionResult, connectionResult, token, expiration, redirectUrl] = result;
            res.cookie(cookieName, token.toString('hex'), {
                domain: domain,
                secure: true,
                httpOnly: true,
                expires: expiration
            });

            res.redirect(redirectUrl);
        })
		.catch(function(err) {
			next(err);
		});
});

module.exports = router;
