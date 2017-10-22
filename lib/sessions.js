'use strict';

const Promise = require('bluebird');
const Tokens = require('csrf');
const _ = require('lodash');
const config = require('config');
const moment = require('moment');
const useragent = require('useragent');

const gid = require('./util/gid');


let options = _.pick(config.csrf, ['saltLength', 'secretLength']);
let tokens = new Tokens(options);


function versionString(obj) {
	let str = '';

	if (obj.major) {
		str += obj.major + '.';
	}

	if (obj.minor) {
		str += obj.minor + '.';
	}

	if (obj.patch) {
		str += obj.patch + '.';
	}

	return str.replace(/\.+$/, '');
}

function create(req, user, options) {
	options = options || {};

	let mongo = global.env.databases.mongo;

	let agent = useragent.parse(req.headers['user-agent']);
	let expiration = (options.persist === true) ? config.sessions.expiration : config.sessions.sessionExpiration;
	let expires = moment.utc().add(expiration, 'seconds').toDate();
	let ttl = (options.persist === true) ? expires : moment.utc().add(7, 'days').toDate();
	let agentOS = agent.os; // Calculate once to save on overhead.
	let agentDevice = agent.device; // Calculate once to save on overhead.

	let document = {
		_id: gid(),
		ip: req.meta.ip,
		meta: {
			agent: agent.source,
			browser: {
				family: agent.family,
				version: versionString(agent)
			},
			os: {
				family: agentOS.family,
				version: versionString(agentOS)
			},
			device: {
				family: (agentDevice.family.toLowerCase() === 'other') ? 'Computer' : agentDevice.family,
				version: versionString(agentDevice)
			}
		},
		token: (gid().toString('hex') + gid().toString('hex') + gid().toString('hex')).toUpperCase(),
		csrf_secret: tokens.secretSync(),
		created: moment.utc().toDate(),
		expires: expires,
		persist: options.persist === true,
		ttl: ttl,
		user_id: user._id
	};

	let session = _.pick(document, ['token', 'csrf_secret', 'expires']);

	return mongo.db('live').collection('sessions').insert(document)
		.then(function() {
			return Promise.resolve(session);
		});
}

function remove(req) {
	let mongo = global.env.databases.mongo;
	let sessionid = req.cookies[config.sessions.cookieName];

	if (!sessionid) {
		return Promise.resolve();
	}

	return mongo.db('live').collection('sessions').updateOne({
		token: sessionid
	}, {
		$set: {
			logout: moment.utc().toDate()
		}
	})
		.then(function() {
			return Promise.resolve(null);
		});
}


module.exports = {
	create: create,
	remove: remove
};
