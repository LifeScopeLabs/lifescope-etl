'use strict';

const mongodb = require('mongodb');
const uuid = require('uuid');


function gid(id) {
	if (arguments.length === 0) {
		id = uuid();
	}

	if (id == null) {
		return null;
	}

	if (id instanceof mongodb.Binary) {
		id = id.toString('hex');
	}

	let byteId = new Buffer(uuid.parse(id));

	return new mongodb.Binary(byteId, mongodb.Binary.SUBTYPE_UUID);
}


module.exports = gid;
