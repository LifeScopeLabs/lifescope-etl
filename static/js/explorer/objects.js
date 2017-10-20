const Promise = require('bluebird');
const $ = require('jquery');
const _ = require('lodash');
const cookies = require('cookies');
const icons = require('icons');
const moment = require('moment');
const nunjucks = require('nunjucks');
const twemoji = require('twemoji');
const viewstate = require('viewstate');


var exports;

var connections = {};
var providers = {};

var taggedSubtypes = ['contacts', 'content', 'location', 'things'];

var protocol = 'https';
var domain = 'lifescope.com';


var connectionPromise = new Promise(function(resolve, reject) {
	// Queries for the user's connections to populate the connector filter DDL.
	$.ajax({
		url: protocol + '://' + domain + '/api/connections',
		type: 'GET',
		dataType: 'json',
		contentType: 'application/json'
	}).done(function(data, status, req) {
		var i, connection;

		for (i = 0; i < data.length; i++) {
			connection = data[i];

			connections[connection.id] = connection;
		}

		resolve();
	}).fail(function(req) {
		var error;

		error = new Error(req.statusText);
		error.code = req.status;

		reject(error);
	});
});

var providerPromise = new Promise(function(resolve, reject) {
	// Queries for the current providers to populate the provider filter DDL.
	$.ajax({
		url: protocol + '://' + domain + '/api/providers',
		type: 'GET',
		dataType: 'json',
		contentType: 'application/json'
	}).done(function(data, status, req) {
		var i, provider;

		for (i = 0; i < data.length; i++) {
			provider = data[i];

			providers[provider.id] = provider;
		}

		resolve();
	}).fail(function(req) {
		var error;

		error = new Error(req.statusText);
		error.code = req.status;

		reject(error);
	});
});

var CONSTRUCTOR_MAPPINGS = {
	contacts: Contact,
	content: Content,
	locations: Location,
	organizations: Organization,
	places: Place,
	things: Thing
};
var RESULT_PAGE_LIMIT = 100;
var TEXT_CHAR_LIMIT = 200;

// The search cursor; keeps track of the current search page.
var cursor;

var renderers = {
	items: {
		feed: new viewstate.View('explorer/items/feed.html'),
		grid: new viewstate.View('explorer/items/grid.html'),
		list: new viewstate.View('explorer/items/list.html'),
		map: new viewstate.View('explorer/items/map.html')
	},

	objects: {
		contact: new viewstate.View('explorer/objects/contact.html'),
		content: new viewstate.View('explorer/objects/content.html'),
		event: new viewstate.View('explorer/objects/event.html'),
		location: new viewstate.View('explorer/objects/location.html'),
		organization: new viewstate.View('explorer/objects/organization.html'),
		person: new viewstate.View('explorer/objects/person.html'),
		place: new viewstate.View('explorer/objects/place.html'),
		thing: new viewstate.View('explorer/objects/thing.html')
	}
};

var cache = {
	contacts: {},
	content: {},
	events: {},
	locations: {},
	people: {},
	places: {},
	organizations: {},
	things: {}
};

var collections = {
	contacts: [],
	content: [],
	events: [],
	locations: [],
	people: [],
	places: [],
	organizations: [],
	things: []
};

/**
 * A wrapper for the Contact object type that parses plain object data into a Contact instance.
 *
 * @constructor
 * @param {Object} data A plain data object containing object data.
 */
function Contact(data) {
	this.id = data.id;
	this.avatar_url = data.avatar_url;
	this.connection = connections[data.connection];
	this.handle = data.handle;
	this.name = data.name;
	this.tagMasks = data.tagMasks;
	this.type = {
		icon: icons.getIcon('contact')
	};
}

_.assign(Contact.prototype, {
	viewContext: function(view) {
		var context, self = this;

		if (view === 'details') {
			return self;
		}

		context = {
			columns: self.constructor.columns[view] || null,
			icon: {
				left: self.type ? self.type.icon : null,
				right: self.provider ? self.provider.icon : null
			},
			object: self,
			sort: self.constructor.sort.fields,
			thumbnail: self.avatar_url || null,
			title: self.name || self.handle || null,
			type: type(self)
		};

		return context;
	}
});

Object.defineProperties(Contact.prototype, {
	tags: {
		enumerable: true,
		get: function() {
			var tags;

			tags = [];

			if (this.tagMasks) {
				_.forEach(this.tagMasks.source, function(tag) {
					if (tags.indexOf(tag) === -1) {
						tags.push(tag);
					}
				});

				_.forEach(this.tagMasks.added, function(tag) {
					if (tags.indexOf(tag) === -1) {
						tags.push(tag);
					}
				});

				_.forEach(this.tagMasks.removed, function(tag) {
					var index = tags.indexOf(tag);

					if (index > -1) {
						tags.splice(index, 1);
					}
				});
			}

			return tags;
		}
	}
});

Contact.columns = {
	list: [
		{
			type: 'text',
			property: 'name'
		},
		{
			type: 'icon',
			icon: 'provider.icon',
			property: 'provider.name'
		},
		{
			type: 'text',
			property: 'handle'
		}
	],

	map: [
		{
			type: 'text',
			property: 'name'
		},
		{
			type: 'icon',
			icon: 'provider.icon',
			property: 'provider.name'
		},
		{
			type: 'text',
			property: 'handle'
		}
	]
};
Contact.className = 'Contact';
Contact.sort = {
	fields: [
	//	{
	//		name: 'Relevance',
	//		property: '_score'
	//	},
		//{
		//	name: 'Name',
		//	property: 'contacts.name.raw'
		//},
		{
			name: 'Connection',
			property: 'connection'
		}
		//{
		//	name: 'Handle',
		//	property: 'contacts.handle.raw'
		//}
	]
};

/**
 * A wrapper for the Content object type that parses plain object data into a Content instance.
 *
 * @constructor
 * @param {Object} data A plain data object containing object data.
 */
function Content(data) {
	this.id = data.id;
	this.connection = connections[data.connection];
	this.embed_content = data.embed_content;
	this.embed_format = data.embed_format;
	this.embed_thumbnail = data.embed_thumbnail;
	this.mimetype = data.mimetype;
	this.owner = data.owner;
	this.tagMasks = data.tagMasks;
	this.text = data.text ? twemoji.parse(data.text) : null;
	this.title = data.title || data.text;
	this.type = {
		name: data.type,
		icon: icons.getIcon('content', data.type)
	};
	this.url = data.url;
}

_.assign(Content.prototype, {
	viewContext: function(view) {
		var context, self = this;

		if (view === 'details') {
			return self;
		}

		context = {
			columns: self.constructor.columns[view] || null,
			icon: {
				left: self.type ? self.type.icon : null,
				right: self.provider ? self.provider.icon : null
			},
			object: self,
			sort: self.constructor.sort.fields,
			thumbnail: self.embed_thumbnail || null,
			title: self.title || null,
			type: type(self)
		};

		return context;
	}
});

Object.defineProperties(Content.prototype, {
	tags: {
		enumerable: true,
		get: function() {
			var tags;

			tags = [];

			if (this.tagMasks) {
				_.forEach(this.tagMasks.source, function(tag) {
					if (tags.indexOf(tag) === -1) {
						tags.push(tag);
					}
				});

				_.forEach(this.tagMasks.added, function(tag) {
					if (tags.indexOf(tag) === -1) {
						tags.push(tag);
					}
				});

				_.forEach(this.tagMasks.removed, function(tag) {
					var index = tags.indexOf(tag);

					if (index > -1) {
						tags.splice(index, 1);
					}
				});
			}

			return tags;
		}
	}
});

Content.columns = {
	list: [
		{
			type: 'text',
			property: 'title'
		},
		{
			type: 'icon',
			icon: 'provider.icon',
			property: 'provider.name'
		},
		{
			type: 'icon',
			icon: 'type.icon',
			property: 'type.name'
		},
		{
			type: 'text',
			property: 'mimetype'
		}
	],

	map: [
		{
			type: 'text',
			property: 'title'
		},
		{
			type: 'icon',
			icon: 'provider.icon',
			property: 'provider.name'
		},
		{
			type: 'icon',
			icon: 'type.icon',
			property: 'type'
		}
	]
};
Content.className = 'Content';
Content.sort = {
	fields: [
		//{
		//	name: 'Relevance',
		//	property: '_score'
		//},
		{
			name: 'Title',
			property: 'content.title'
		},
		{
			name: 'Connection',
			property: 'connection'
		},
		{
			name: 'Type',
			property: 'content.type'
		}
	]
};

/**
 * A wrapper for the Event object type that parses plain object data into an Event instance.
 *
 * @constructor
 * @param {Object} data A plain data object containing object data.
 */
function Event(data) {
	this.id = data.id;
	this.context = data.context;
	this.contact_interaction_type = data.content_interaction_type;
	this.date = moment(data.datetime || data.created);
	this.date.estimated = !data.datetime;
	this.tagMasks = data.tagMasks;
	this.type = {
		name: data.type,
		icon: icons.getIcon('event', data.type)
	};

	this.connection = connections[data.connection];
	this.provider = {
		id: data.provider,
		icon: icons.getIcon('provider', data.provider_name),
		name: data.provider_name
	};
}

_.assign(Event.prototype, {
	viewContext: function(view) {
		var context, firstItem, self = this;

		if (view === 'details') {
			return self;
		}

		firstItem = self.firstItem;

		self.sumTags = self.uniqueTags;

		context = {
			columns: self.constructor.columns[view] || null,
			icon: {
				left: self.type ? self.type.icon : null,
				right: self.provider ? self.provider.icon : null
			},
			object: self,
			sort: self.constructor.sort.fields,
			sumTags: self.sumTags,
			thumbnail: firstItem ? firstItem.embed_thumbnail : null,
			title: firstItem ? firstItem.title : null,
			type: type(self)
		};

		return context;
	}
});

Object.defineProperties(Event.prototype, {
	allTags: {
		enumerable: true,
		get: function() {
			var allTags, h, index, subType, tags;

			allTags = [];

			for (h = 0; h < taggedSubtypes.length; h++) {
				subType = taggedSubtypes[h];

				if (subType === 'location' && this.location && this.location.tagMasks) {
					tags = [];

					_.forEach(this.location.tagMasks.source, function(tag) {
						if (tags.indexOf(tag) === -1) {
							tags.push(tag);
						}
					});

					_.forEach(this.location.tagMasks.added, function(tag) {
						if (tags.indexOf(tag) === -1) {
							tags.push(tag);
						}
					});

					_.forEach(this.location.tagMasks.removed, function(tag) {
						index = tags.indexOf(tag);

						if (index > -1) {
							tags.splice(index, 1);
						}
					});

					allTags.concat(tags);
				}
				else if (this[subType]) {
					_.forEach(this[subType], function(item) {
						if (item.tagMasks) {
							tags = [];

							_.forEach(item.tagMasks.source, function(tag) {
								if (tags.indexOf(tag) === -1) {
									tags.push(tag);
								}
							});

							_.forEach(item.tagMasks.added, function(tag) {
								if (tags.indexOf(tag) === -1) {
									tags.push(tag);
								}
							});

							_.forEach(item.tagMasks.removed, function(tag) {
								index = tags.indexOf(tag);

								if (index > -1) {
									tags.splice(index, 1);
								}
							});

							allTags.concat(tags);
						}
					});
				}
			}

			return allTags;
		}
	},

	firstContact: {
		enumerable: true,
		get: function() {
			var contacts;

			contacts = this.contacts;

			if (contacts && contacts.length > 0) {
				return contacts[0];
			}

			return null;
		}
	},

	firstItem: {
		enumerable: true,
		get: function() {
			var content, things;

			content = this.content;

			if (content && content.length > 0) {
				return content[0];
			}

			things = this.things;

			if (things && things.length > 0) {
				return things[0];
			}

			return null;
		}
	},

	firstPlace: {
		enumerable: true,
		get: function() {
			var places;

			places = this.places;

			if (places && places.length > 0) {
				return places[0];
			}

			return null;
		}
	},

	contextOrType: {
		enumerable: true,
		get: function() {
			return this.context ? this.context : this.type.name[0].toUpperCase() + this.type.name.slice(1);
		}
	},

	tags: {
		enumerable: true,
		get: function() {
			var tags;

			tags = [];

			if (this.tagMasks) {
				_.forEach(this.tagMasks.source, function(tag) {
					if (tags.indexOf(tag) === -1) {
						tags.push(tag);
					}
				});

				_.forEach(this.tagMasks.added, function(tag) {
					if (tags.indexOf(tag) === -1) {
						tags.push(tag);
					}
				});

				_.forEach(this.tagMasks.removed, function(tag) {
					var index = tags.indexOf(tag);

					if (index > -1) {
						tags.splice(index, 1);
					}
				});
			}

			return tags;
		}
	},

	uniqueTags: {
		enumerable: true,
		get: function() {
			var h, index, subDocument, subType, tags;

			tags = [];

			for (h = 0; h < taggedSubtypes.length; h++) {
				subType = taggedSubtypes[h];

				if (subType === 'location' && this.location && this.location.tagMasks) {
					_.forEach(this.location.tagMasks.source, function(tag) {
						if (tags.indexOf(tag) === -1) {
							tags.push(tag);
						}
					});

					_.forEach(this.location.tagMasks.added, function(tag) {
						if (tags.indexOf(tag) === -1) {
							tags.push(tag);
						}
					});

					_.forEach(this.location.tagMasks.removed, function(tag) {
						index = tags.indexOf(tag);

						if (index > -1) {
							tags.splice(index, 1);
						}
					});
				}
				else if (this[subType]) {
					_.forEach(this[subType], function(item) {
						subDocument = item;

						if (subDocument.tagMasks) {
							_.forEach(subDocument.tagMasks.source, function(tag) {
								if (tags.indexOf(tag) === -1) {
									tags.push(tag);
								}
							});

							_.forEach(subDocument.tagMasks.added, function(tag) {
								if (tags.indexOf(tag) === -1) {
									tags.push(tag);
								}
							});

							_.forEach(subDocument.tagMasks.removed, function(tag) {
								index = tags.indexOf(tag);

								if (index > -1) {
									tags.splice(index, 1);
								}
							});
						}
					});
				}
			}

			if (this.tagMasks) {
				_.forEach(this.tagMasks.source, function(tag) {
					if (tags.indexOf(tag) === -1) {
						tags.push(tag);
					}
				});

				_.forEach(this.tagMasks.added, function(tag) {
					if (tags.indexOf(tag) === -1) {
						tags.push(tag);
					}
				});

				_.forEach(this.tagMasks.removed, function(tag) {
					index = tags.indexOf(tag);

					if (index > -1) {
						tags.splice(index, 1);
					}
				});
			}

			return tags;
		}
	}
});

Event.columns = {
	list: [
		{
			type: 'text',
			property: 'firstItem.title'
		},
		{
			type: 'icon',
			property: 'contextOrType',
			icon: 'type.icon'
		},
		{
			type: 'icon',
			property: 'provider.name',
			icon: 'provider.icon'
		},
		{
			type: 'text',
			property: 'firstContact.handle',
			mobileHide: true
		},
		{
			type: 'text',
			property: 'date'
		}
	],

	map: [
		{
			type: 'icon',
			property: 'type.icon'
		},
		{
			type: 'icon',
			property: 'provider.icon'
		},
		{
			type: 'icon',
			icon: 'itemIcon'
		},
		{
			type: 'text',
			property: 'date.datetime'
		}
	]
};
Event.className = 'Event';
Event.sort = {
	fields: [
		//{
		//	name: 'Relevance',
		//	property: '_score'
		//},
		{
			name: 'Connection',
			property: 'connection'
		},
		{
			name: 'Type',
			property: 'type'
		},
		{
			name: 'Time',
			property: 'datetime'
		}
	]
};

/**
 * A wrapper for the Location object type that parses plain object data into a Location instance.
 *
 * @constructor
 * @param {Object} data A plain data object containing object data.
 */
function Location(data) {
	this.id = data.id;
	this.connection = connections[data.connection];
	this.date = moment(data.datetime || data.created);
	this.geo_format = data.geo_format;
	this.geolocation = data.geolocation;
	this.resolution = data.resolution;
	this.tagMasks = data.tagMasks;
	this.type = {
		icon: icons.getIcon('locations')
	};
}

_.assign(Location.prototype, {
	viewContext: function(view) {
		var context, self = this;

		if (view === 'details') {
			return self;
		}

		context = {
			columns: self.constructor.columns[view] || null,
			icon: {
				left: self.type ? self.type.icon : null,
				right: null
			},
			object: self,
			sort: self.constructor.sort.fields,
			type: type(self)
		};

		return context;
	}
});

Location.columns = {
	list: [
		{
			type: 'text',
			property: 'geolocation',
			displayMobile: true
		}
	],

	map: [
		{
			type: 'text',
			property: 'date.dateTime'
		}
	]
};
Location.className = 'Location';
Location.sort = {
	fields: [
		//{
		//	name: 'Relevance',
		//	property: '_score'
		//},
		{
			name: 'Connection',
			property: 'connection'
		}
	]
};

/**
 * A wrapper for the Organization object type that parses plain object data into an Organization instance.
 *
 * @constructor
 * @param {Object} data A plain data object containing object data.
 */
function Organization(data) {
	this.id = data.id;
	this.name = data.name;
	this.text = data.text;
	this.thumbnail = data.thumbnail;
	this.type = {
		name: data.type,
		icon: icons.getIcon('organization', data.type)
	};
	this.url = data.url;
}

_.assign(Organization.prototype, {
	viewContext: function(view) {
		var context, self = this;

		if (view === 'details') {
			return self;
		}

		context = {
			columns: self.constructor.columns[view] || null,
			icon: {
				left: self.type ? self.type.icon : null,
				right: null
			},
			object: self,
			sort: self.constructor.sort.fields,
			thumbnail: self.embed_thumbnail || null,
			title: self.name || null,
			type: type(self)
		};

		return context;
	}
});

Organization.columns = {
	list: [
		{
			type: 'text',
			property: 'name',
			displayMobile: true
		},
		{
			type: 'icon',
			icon: 'icon',
			property: 'type.icon',
			displayMobile: true
		}
	],

	map: [
		{
			type: 'text',
			property: 'name'
		},
		{
			type: 'icon',
			icon: 'icon',
			property: 'type'
		}
	]
};
Organization.className = 'Organization';
Organization.sort = {
	fields: [
		//{
		//	name: 'Relevance',
		//	property: '_score'
		//},
		{
			name: 'Name',
			property: 'organizations.name'
		},
		{
			name: 'Type',
			property: 'organizations.type'
		},
		{
			name: 'Connection',
			property: 'connection'
		}
	]
};

/**
 *
 * @constructor
 * @param {Object} data
 */
function Person(data) {
	this.id = data.id;
}

_.assign(Person.prototype, {
	viewContext: function(view) {
		var context, self = this;

		if (view === 'details') {
			return self;
		}

		context = {
			columns: self.constructor.columns[view] || null,
			icon: {
				left: self.type ? self.type.icon : null,
				right: null
			},
			object: self,
			sort: self.constructor.sort.fields,
			thumbnail: self.embed_thumbnail || null,
			title: self.first_name ? (self.first_name + ' ' + self.last_name) : null,
			type: type(self)
		};

		return context;
	}
});

Person.columns = {
	list: [
		{
			type: 'text',
			property: 'first_name'
		},
		{
			type: 'text',
			property: 'last_name'
		},
		{
			type: 'text',
			property: 'age'
		},
		{
			type: 'text',
			property: 'gender'
		}
	],

	map: [
		{
			type: 'text',
			property: 'first_name'
		},
		{
			type: 'text',
			property: 'last_name'
		},
		{
			type: 'text',
			property: 'age'
		},
		{
			type: 'text',
			property: 'gender'
		}
	]
};
Person.className = 'Person';
Person.sort = {
	fields: [
		//{
		//	name: 'Relevance',
		//	property: '_score'
		//},
		{
			name: 'First Name',
			property: 'person.first_name'
		},
		{
			name: 'Last Name',
			property: 'person.last_name'
		},
		{
			name: 'Age',
			property: 'age'
		},
		{
			name: 'Gender',
			property: 'person.gender'
		}
	]
};

/**
 * A wrapper for the Place object type that parses plain object data into a Place instance.
 *
 * @constructor
 * @param {Object} data A plain data object containing object data.
 */
function Place(data) {
	this.id = data.id;
	this.name = data.name;
	this.reverse_geo_format = data.reverse_geo_format;
	this.reverse_geolocation = data.reverse_geolocation;
	this.text = data.text;
	this.type = {
		name: data.type,
		icon: icons.getIcon('places')
	};
	this.url = data.url;
}

_.assign(Place.prototype, {
	viewContext: function(view) {
		var context, self = this;

		if (view === 'details') {
			return self;
		}

		context = {
			columns: self.constructor.columns[view] || null,
			icon: {
				left: self.type ? self.type.icon : null,
				right: null
			},
			object: self,
			sort: self.constructor.sort.fields,
			thumbnail: self.embed_thumbnail || null,
			title: self.reverse_geolocation ? self.reverse_geolocation : null,
			type: type(self)
		};

		return context;
	}
});

Place.columns = {
	list: [
		{
			type: 'text',
			property: 'name'
		},
		{
			type: 'text',
			property: 'reverse_geolocation'
		},
		{
			type: 'text',
			property: 'type'
		}
	],

	map: [
		{
			type: 'text',
			property: 'name'
		},
		{
			type: 'text',
			property: 'type'
		}
	]
};
Place.className = 'Place';
Place.sort = {
	fields: [
		//{
		//	name: 'Relevance',
		//	property: '_score'
		//},
		{
			name: 'Name',
			property: 'place.name'
		},
		{
			name: 'Location',
			property: 'place.reverse_geolocation'
		},
		{
			name: 'Type',
			property: 'place.type'
		},
		{
			name: 'Connection',
			property: 'connection'
		}
	]
};

/**
 * A wrapper for the Thing object type that parses plain object data into a Thing instance.
 *
 * @constructor
 * @param {Object} data A plain data object containing object data.
 */
function Thing(data) {
	this.id = data.id;
	this.connection = connections[data.connection];
	this.embed_content = data.embed_content;
	this.embed_format = data.embed_format;
	this.embed_thumbnail = data.embed_thumbnail;
	this.mimetype = data.mimetype;
	this.owner = data.owner;
	this.tagMasks = data.tagMasks;
	this.text = data.text;
	this.title = data.title;
	this.type = {
		name: data.type.replace(/_/g, ' '),
		icon: icons.getIcon('thing', data.type)
	};
	this.url = data.url;
}

_.assign(Thing.prototype, {
	viewContext: function(view) {
		var context, self = this;

		if (view === 'details') {
			return self;
		}

		context = {
			columns: self.constructor.columns[view] || null,
			icon: {
				left: self.type ? self.type.icon : null,
				right: self.provider ? self.provider.icon : null
			},
			object: self,
			sort: self.constructor.sort.fields,
			thumbnail: self.embed_thumbnail || null,
			title: self.title || null,
			type: type(self)
		};

		return context;
	}
});

Thing.columns = {
	list: [
		{
			type: 'text',
			property: 'title'
		},
		{
			type: 'icon',
			icon: 'providerIcon',
			property: 'provider_name'
		},
		{
			type: 'icon',
			icon: 'icon',
			property: 'type.name'
		}
	],

	map: [
		{
			type: 'text',
			property: 'title'
		},
		{
			type: 'icon',
			icon: 'providerIcon',
			property: 'provider_name'
		},
		{
			type: 'icon',
			icon: 'icon',
			property: 'type'
		}
	]
};
Thing.className = 'Thing';
Thing.sort = {
	fields: [
		//{
		//	name: 'Relevance',
		//	property: '_score'
		//},
		{
			name: 'Title',
			property: 'things.title'
		},
		{
			name: 'Type',
			property: 'things.type'
		},
		{
			name: 'Connection',
			property: 'connection'
		}
	]
};

/**
 * Resets the internal search cache. Clears the lists of objects, the ID cache, and the current search pointer.
 */
function clear() {
	var key;

	for (key in cache) {
		if (!cache.hasOwnProperty(key)) {
			break;
		}

		cache[key] = {};
		collections[key].length = 0;
	}
}

/**
 * Loads the next page of the current search. If no current search is active or there is no next page, the returned
 * promise is instantly resolved with `null`.
 *
 * @returns {Promise} A promise that is resolved with the processed page result when the search results are
 *     obtained from the server.
 */
function more() {
	// If the current search cursor doesn't exist, then just immediately resolve with null. Alternatively there may
	// be no more pages in the result set, in which case, `null` should also be resolved out.
	if (!cursor || !cursor.next) {
		return Promise.resolve(null);
	}

	return new Promise(function(resolve, reject) {
		$.ajax({
			url: cursor.next.url,
			type: cursor.next.method,
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify(cursor.next.body),
			headers: {
				'X-CSRF-Token': window.csrftoken
			}
		}).done(function(data) {
			var processed;

			cursor.prev = data.prev;
			cursor.next = data.next;
			cursor.count = data.count;

			processed = process(data.results);

			resolve(processed);
		}).fail(function(err) {
			reject(err);
		});
	});
}

/**
 * Consumes raw data from the API and parses it into the internal cache and a page object. Establishes references
 * between related objects and avoids overwriting existing cached items.
 *
 * @param {Object} data Raw data from the ElasticSearch API.
 * @returns {Object} The data parsed into a page object with lists corresponding to each tracked object type.
 */
function process(data, cacheOnly) {
	var i, Constructor, event, events, list, obj, page, parse, result, type;

	page = {};
	// Create a new event array, this needs to be outside the loop because "event" is our main data type. The
	// remaining types dangle off event for the time being.
	page.events = events = [];

	for (i = 0; i < data.length; i++) {
		result = data[i];
		event = new Event(result);

		// Store the newly created event in the cache.
		cache.events[event.id] = event;
		// Push the new event onto the page result.
		events.push(event);

		// Iterate over the constructors associated with the data types we'd like to parse OFF the event (e.g.
		// contact, content, etc.). The constructor array and mapped fields array
		for (type in CONSTRUCTOR_MAPPINGS) {
			if (!CONSTRUCTOR_MAPPINGS.hasOwnProperty(type)) {
				break;
			}

			Constructor = CONSTRUCTOR_MAPPINGS[type];

			parse = function(item) {
				var obj;

				// This code block will need to be changed if the item.id is not guaranteed to match the obj.id.
				if (cache[type].hasOwnProperty(item.id)) {
					return cache[type][item.id];
				}

				// Create a new sub-type object and cache it.
				obj = new Constructor(item);

				if (obj.text && obj.text.length > TEXT_CHAR_LIMIT) {
					obj.text_truncated = obj.text.slice(0, TEXT_CHAR_LIMIT) + '...';
				}

				// Set up the relations by reference to save memory (and protect the integrity of the cache (e.g.
				// document fragments associated with a particular item).
				obj.event = event;
				// TODO: Spoofing provider as the event provider until we have separate providers for contacts.
				obj.provider = event.provider;

				return obj;
			};

			if (result[type]) {
				// Add the type to the page if it doesn't already exist.
				if (!page.hasOwnProperty(type)) {
					page[type] = [];
				}

				// If the related objects are an array (collection), then parse the array accordingly. Otherwise
				// parse the single element.
				if (Array.isArray(result[type])) {
					// Set up the backreference relations by reference.
					// TODO: backreferences can be arrays as well, e.g. a game can map to multiple events.
					event[type] = list = _.map(result[type], parse);
					list = _.filter(list, function(item) {
						var exists;

						exists = cache[type].hasOwnProperty(item.id);

						if (!exists) {
							cache[type][item.id] = item;
						}

						return !exists;
					});

					if (!cacheOnly) {
						// Add parsed objects to the internal cache.
						Array.prototype.push.apply(collections[type], list);

						// Add parsed objects to the page.
						Array.prototype.push.apply(page[type], list);
					}
				}
				else {
					// Set up the backreference relations by reference.
					event[type] = obj = parse(result[type]);

					if (!cacheOnly) {
						// Add the parsed object to the page.
						if (!cache[type].hasOwnProperty(obj.id)) {
							collections[type].push(obj);
						}

						// Add the parsed object to the page.
						if (!cache[type].hasOwnProperty(obj.id)) {
							cache[type][obj.id] = obj;
							page[type].push(obj);
						}
					}
				}
			}
		}
	}

	if (!cacheOnly) {
		// Do a single concat on the event internal cache to save some memory (as opposed to many `.push()` calls inside
		// the loop.
		Array.prototype.push.apply(collections.events, events);
	}

	return page;
}

/**
 * Converts a search object into a DOM element and caches the resulting render. Subsequent calls to the same object
 * with the same view type return a clone of the cached DOM element.
 *
 * @private
 * @param {String} view The view type to render.
 * @param {Array|Object} object The search object or array of search objects to convert into a DOM element(s).
 * @returns {HTMLElement} A DOM element clone associated with the object/view pair.
 */
function render(view, object) {
	var i, context, objtype, promise, promises, renderer, subobjects;

	if (Array.isArray(object)) {
		promises = new Array(object.length);

		for (i = 0; i < object.length; i++) {
			promises[i] = render(view, object[i]);
		}

		return Promise.all(promises);
	}

	view = view.toLowerCase();
	objtype = type(object);

	if (!object._renderCache) {
		object._renderCache = {};
	}

	if (!object._viewFragments) {
		object._viewFragments = {};
	}

	if (object._renderCache.hasOwnProperty(view)) {
		promise = Promise.resolve(object._renderCache[view]);
	}
	else {
		context = object.viewContext(view);

		if (renderers.items.hasOwnProperty(view)) {
			renderer = renderers.items[view];
		}
		else {
			renderer = renderers.objects[objtype];
		}

		promise = renderer.render(context)
			.then(function(fragment) {
				object._renderCache[view] = fragment;

				return Promise.resolve(fragment);
			});
	}

	promise = promise.then(function(fragment) {
		var clone;

		function createClone(fragment) {
			var clone;

			clone = fragment.cloneNode(true);
			object._viewFragments[view] = clone;

			$(clone).data('object', object);

			return clone;
		}

		if (Array.isArray(fragment)) {
			clone = fragment.map(createClone);
		}
		else {
			clone = createClone(fragment);
		}

		return Promise.resolve(clone);
	});

	if (view === 'feed') {
		promise = promise.then(function(fragment) {
			return render('details', object)
				.then(function(details) {
					var j, $interactions, $item, $textItem, $textItems;

					fragment.appendChild(details);

					$item = $(fragment);
					$textItems = $item.find('.text');
					$interactions = $item.find('.interactions .objects');

					for (j = 0; j < $textItems.length; j++) {
						$textItem = $($textItems.get(j));

						if ($textItem.find('.truncated').length === 0) {
							$textItem.find('.expand').hide();
						}
						else {
							$textItem.find('.full').hide();
						}
					}

					if ($interactions.children().length > 5) {
						$interactions.children().slice(5).hide();
					}
					else {
						$interactions.siblings('.expand').hide();
					}

					return Promise.resolve(fragment);
				});
		});
	}
	else if (view === 'details' && objtype === 'event') {
		subobjects = (function(promise) {
			return function subobjects(type, selector) {
				return promise.then(function(fragment) {
					return Promise.all(_.map(object[type], function(item) {
						return render('details', item);
					})).then(function(content) {
						var container;

						if (container = fragment.querySelector(selector)) {
							$(container).append(content);
						}

						return Promise.resolve(fragment);
					});
				});
			};
		})(promise);

		promise = promise.then(function(fragment) {
			return Promise.all([
				subobjects('content', 'section.content'),
				subobjects('things', 'section.content'),
				subobjects('contacts', 'aside.interactions .objects'),
				subobjects('organizations', 'aside.interactions .objects')
			]).then(function() {
				return Promise.resolve(fragment);
			});
		});
	}

	return promise;
}

/**
 * Loads the first page of the specified search. Will, by necessity, clear the current search and reprocess the
 * filters and query.
 *
 * @param {Object} [options] An objects object that can contain parameters controlling the sort direction, etc.
 * @returns {Promise} A promise that is resolved with the processed page result when the search results are obtained
 *     from the server.
 */
function search(options) {
	var data;

	options = options || {};

	data = {};

	if (options.dsl) {
		data.filters = options.dsl;
	}

	if (options.query) {
		data.q = options.query;
	}

	if (options.sortField) {
		data.sortField = options.sortField;
	}

	if (options.sortOrder) {
		data.sortOrder = options.sortOrder;
	}

	data.limit = options.limit || RESULT_PAGE_LIMIT;
	data.offset = options.offset || 0;

	// Execute the search by querying the events with the specified DSL.
	return new Promise(function(resolve, reject) {
		$.ajax({
			url: protocol + '://' + domain + '/api/events',
			type: 'SEARCH',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify(data),
			headers: {
				'X-CSRF-Token': window.csrftoken
			}
		}).done(function(data) {
			var processed;

			// Set the current search cursor so that we can run `.more()`.
			cursor = {
				prev: data.prev,
				next: data.next,
				count: data.count,
				sort: {
					field: data.sortField || null,
					order: data.sortOrder || null
				}
			};

			// Clear the existing cached data.
			clear();
			// Process the search results into the internal cache.
			processed = process(data.results);

			resolve(processed);
		}).fail(function(err) {
			reject(err);
		});
	});
}

/**
 * Returns the constructor name for a search.js object cast to lowercase.
 *
 * @param {Object} object
 * @returns {string}
 */
function type(object) {
	return object.constructor.className.toLowerCase();
}


exports = {
	Contact: Contact,
	Content: Content,
	Event: Event,
	Location: Location,
	Organization: Organization,
	Person: Person,
	Place: Place,
	Thing: Thing,

	clear: clear,
	more: more,
	process: process,
	render: render,
	search: search,
	type: type,

	cache: cache,
	collections: collections,
	connectionPromise: connectionPromise,
	connections: connections,
	providerPromise: providerPromise,
	providers: providers
};

Object.defineProperties(exports, {
	cursor: {
		enumerable: true,
		get: function() {
			return cursor;
		}
	}
});


module.exports = exports;
