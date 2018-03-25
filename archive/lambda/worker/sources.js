'use strict';


class Source {
	constructor(schema, connection, api) {
		if (schema.hasOwnProperty('enabled')) {
			this.enabled = schema.enabled === true;
		}

		if (schema.hasOwnProperty('frequency')) {
			this.frequency = schema.frequency;
		}

		if (schema.hasOwnProperty('updated')) {
			this.updated = schema.updated;
		}

		this.connection = connection;
		this.name = schema.name || null;
		this.internalName = schema.internalName || null;
		this.population = schema.population || null;
		this.enabled = schema.enabled_by_default === true;
		this.frequency = 1;
		this.mapping = schema.mapping || null;
		this.api = api;
	}

	call(connectionId, parameters, headers) {
		let self = this;

		let outgoingHeaders = headers || {};

		outgoingHeaders['X-Connection-Id'] = connectionId;

		if (this.population != null) {
			outgoingHeaders['X-Populate'] = this.population;
		}

		return this.api.endpoint(this.mapping)({
			headers: outgoingHeaders,
			parameters: parameters
		})
			.then(function(result) {
				let [data, response] = result;

				if (!(/^2/.test(response.statusCode))) {
					let body = JSON.parse(response.body);

					return Promise.reject(new Error('Error calling ' + self.name + ': ' + body.message));
				}

				return Promise.resolve(data);
			});
	}
}


module.exports = {
	Source: Source
};
