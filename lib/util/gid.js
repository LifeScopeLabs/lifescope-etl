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

	let byteId = new Buffer(uuid.parse(id));
	//let hexId = byteId.toString('hex');

	return new mongodb.Binary(byteId, mongodb.Binary.SUBTYPE_UUID);
}


module.exports = gid;
