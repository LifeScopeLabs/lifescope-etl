'use strict';

const Validator = require('ajv');
const _ = require('lodash');
const refParser = require('json-schema-ref-parser');

const fs = require('./util/fs');


function load(schemas) {
	let validator = new Validator({
		coerceTypes: true,
		useDefaults: true
	});

	return fs.find(schemas)
		.then(function(result) {
			let promises = _.map(result, function(schema) {
				return refParser.bundle(schema);
			});

			return Promise.all(promises);
		})
		.then(function(result) {
			for (let i = 0; i < result.length; i++) {
				let schema = result[i];

				validator.addSchema(schema, schema.id);
			}

			function validate(schema, value) {
				try {
					validator.validate(schema, value);
				} catch(err) {
					return Promise.reject(err);
				}

				if (validator.errors) {
					let error = new Validator.ValidationError(validator.errors);

					return Promise.reject(error);
				}

				return Promise.resolve(value);
			}

			return Promise.resolve(validate);
		});
}

module.exports = {
	load: load
};
