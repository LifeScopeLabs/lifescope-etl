'use strict';


function Connection(data) {
	this.id = data._id.toString('hex');
	this.auth = data.auth;
	this.created = data.created;
	this.enabled = data.enabled;
	this.endpoint_data = data.endpoint_data;
	this.frequency = data.frequency;
	this.last_run = data.last_run;
	this.metadata = data.metadata;
	this.name = data.name;
	this.permissions = data.permissions;
	this.provider_id = data.provider_id.toString('hex');
	this.updated = data.updated;
	this.user_id = data.user_id.toString('hex');
	this.usa_id = data.usa_id;

	if (data.provider) {
		this.provider = new Provider(data.provider);
	}
}

Connection.prototype.toJSON = function() {
	return {
		id: this.id,
		auth: this.auth,
		enabled: this.enabled,
		frequency: this.frequency,
		last_run: this.last_run,
		name: this.name,
		permissions: this.permissions,
		provider: this.provider,
		provider_id: this.provider_id,
		user_id: this.user_id
	};
};

Connection.create = function(document) {
	return new Connection(document);
};


function Contact(data) {
	this.id = data._id.toString('hex');
	this.avatar_url = data.avatar_url;
	this.connection = data.connection.toString('hex');
	this.created = data.created;
	this.handle = data.handle;
	this.identifier = data.identifier;
	this.name = data.name;
	this.provider_name = data.provider_name;
	this.remote_id = data.remote_id;
	this.source = data.source;
	this.tagMasks = data.tagMasks;
	this.updated = data.updated;
	this.user_id = data.user_id;
}

Contact.prototype.toJSON = function() {
	return {
		id: this.id,
		avatar_url: this.avatar_url,
		handle: this.handle,
		name: this.name,
		provider_name: this.provider_name,
		tagMasks: this.tagMasks
	};
};

Contact.create = function(document) {
	return new Contact(document);
};


function Content(data) {
	this.id = data._id.toString('hex');
	this.connection = data.connection.toString('hex');
	this.created = data.created;
	this.embed_content = data.embed_content;
	this.embed_format = data.embed_format;
	this.embed_thumbnail = data.embed_thumbnail;
	this.identifier = data.identifier;
	this.mimetype = data.mimetype;
	this.owner = data.owner;
	this.provider_name = data.provider_name;
	this.remote_id = data.remote_id;
	this.source = data.source;
	this.tagMasks = data.tagMasks;
	this.text = data.text;
	this.title = data.title;
	this.type = data.type;
	this.updated = data.updated;
	this.url = data.url;
	this.user_id = data.user_id;
}

Content.prototype.toJSON = function() {
	return {
		id: this.id,
		embed_content: this.embed_content,
		embed_format: this.embed_format,
		embed_thumbnail: this.embed_thumbnail,
		mimetype: this.mimetype,
		owner: this.owner,
		provider_name: this.provider_name,
		tagMasks: this.tagMasks,
		text: this.text,
		title: this.title,
		type: this.type,
		url: this.url
	};
};

Content.create = function(document) {
	return new Content(document);
};


function Event(data) {
	this.id = data._id.toString('hex');
	this.connection = data.connection.toString('hex');
	this.contact_interaction_type = data.contact_interaction_type;
	this.context = data.context;
	this.contacts = data.contacts;
	this.content = data.content;
	this.created = data.created;
	this.datetime = data.datetime;
	this.identifier = data.identifier;
	this.location = data.location;
	this.places = data.places;
	this.provider = data.provider;
	this.provider_name = data.provider_name;
	this.source = data.source;
	this.tagMasks = data.tagMasks;
	this.things = data.things;
	this.type = data.type;
	this.updated = data.updated;
	this.user_id = data.user_id;
}

Event.prototype.toJSON = function() {
	return {
		id: this.id,
		connection: this.connection,
		contact_interaction_type: this.contact_interaction_type,
		context: this.context,
		contacts: this.contacts,
		content: this.content,
		created: this.created,
		datetime: this.datetime,
		location: this.location,
		places: this.places,
		provider_name: this.provider_name,
		tagMasks: this.tagMasks,
		things: this.things,
		type: this.type
	};
};

Event.create = function(document) {
	return new Event(document);
};


function Location(data) {
	this.id = data._id.toString('hex');
	this.connection = data.connection.toString('hex');
	this.datetime = data.datetime;
	this.geo_format = data.geo_format;
	this.geolocation = data.geolocation;
	this.provider_name = data.provider_name;
	this.remote_id = data.remote_id;
	this.resolution = data.resolution;
	this.source = data.source;
	this.tagMasks = data.tagMasks;
	this.user_id = data.user_id;
}

Location.prototype.toJSON = function() {
	return {
		id: this.id,
		datetime: this.datetime,
		geo_format: this.geo_format,
		geolocation: this.geolocation,
		provider_name: this.provider_name,
		resolution: this.resolution,
		tagMasks: this.tagMasks
	};
};

Location.create = function(document) {
	return new Location(document);
};


function Organization(data) {
	this.id = data._id.toString('hex');
	this.connection = data.connection.toString('hex');
	this.contacts = data.contacts;
	this.created = data.created;
	this.identifier = data.identifier;
	this.name = data.name;
	this.provider_name = data.provider_name;
	this.text = data.text;
	this.thumbnail = data.thumbnail;
	this.type = data.type;
	this.updated = data.updated;
	this.url = data.url;
	this.user_id = data.user_id;
}

Organization.prototype.toJSON = function() {
	return {
		id: this.id,
		contacts: this.contacts,
		name: this.name,
		provider_name: this.provider_name,
		text: this.text,
		thumbnail: this.thumbnail,
		type: this.type,
		url: this.url
	};
};

Organization.create = function(document) {
	return new Organization(document);
};


function Place(data) {
	this.id = data._id.toString('hex');
	this.connection = data.connection.toString('hex');
	this.created = data.created;
	this.identifier = data.identifier;
	this.location = data.location;
	this.name = data.name;
	this.remote_id = data.remote_id;
	this.reverse_geolocation = data.reverse_geolocation;
	this.reverse_geo_format = data.reverse_geo_format;
	this.source = data.source;
	this.text = data.text;
	this.type = data.type;
	this.updated = data.updated;
	this.url = data.url;
	this.user_id = data.user_id;
}

Place.prototype.toJSON = function() {
	return {
		id: this.id,
		location: this.location,
		name: this.name,
		reverse_geolocation: this.reverse_geolocation,
		reverse_geo_format: this.reverse_geo_format,
		text: this.text,
		type: this.type,
		url: this.url
	};
};

Place.create = function(document) {
	return new Place(document);
};


function Provider(data) {
	this.id = data._id.toString('hex');
	this.auth = data.auth;
	this.description = data.description;
	this.enabled = data.enabled;
	this.endpoints = data.endpoints;
	this.metadata = data.metadata;
	this.name = data.name;
	this.sources = data.sources;
	this.tags = data.tags;
	this.url = data.url;
	this.uuid = data.uuid;
}

Provider.prototype.toJSON = function() {
	return {
		id: this.id,
		auth: this.auth,
		description: this.description,
		enabled: this.enabled,
		endpoints: this.endpoints,
		name: this.name,
		sources: this.sources,
		tags: this.tags,
		url: this.url
	};
};

Provider.create = function(document) {
	return new Provider(document);
};


function Search(data) {
	this.id = data._id.toString('hex');
	this.count = data.count;
	this.favorited = data.favorited;
	this.filters = data.filters;
	this.hash = data.hash;
	this.icon = data.icon;
	this.icon_color = data.icon_color;
	this.labels = data.labels;
	this.last_run = data.last_run;
	this.name = data.name;
	this.query = data.query;
	this.tags = data.tags;
	this.user_id = data.user_id;
}

Search.prototype.toJSON = function() {
	return {
		id: this.id,
		count: this.count,
		favorited: this.favorited,
		filters: this.filters,
		icon: this.icon,
		icon_color: this.icon_color,
		labels: this.labels,
		last_run: this.last_run,
		name: this.name,
		query: this.query,
		tags: this.tags
	};
};

Search.create = function(document) {
	return new Search(document);
};


function Thing(data) {
	this.id = data._id.toString('hex');
	this.connection = data.connection.toString('hex');
	this.created = data.created;
	this.embed_content = data.embed_content;
	this.embed_format = data.embed_format;
	this.embed_thumbnail = data.embed_thumbnail;
	this.identifier = data.identifier;
	this.locations = data.locations;
	this.owner = data.owner;
	this.remote_id = data.remote_id;
	this.source = data.source;
	this.tagMasks = data.tagMasks;
	this.text = data.text;
	this.title = data.title;
	this.type = data.type;
	this.updated = data.updated;
	this.url = data.url;
	this.user_id = data.user_id;
}

Thing.prototype.toJSON = function() {
	return {
		id: this.id,
		embed_content: this.embed_content,
		embed_format: this.embed_format,
		embed_thumbnail: this.embed_thumbnail,
		locations: this.locations,
		owner: this.owner,
		tagMasks: this.tagMasks,
		text: this.text,
		title: this.title,
		type: this.type,
		url: this.url
	};
};

Thing.create = function(document) {
	return new Thing(document);
};


function User(data) {
	this.id = data.id;
	this.birthday = data.birthday;
	this.date_joined = data.date_joined;
	this.email = data.email;
	this.first_name = data.first_name;
	this.gender = data.gender;
	this.handle = data.handle;
	this.is_active = data.is_active;
	this.last_login = data.last_login;
	this.last_name = data.last_name;
	this.newsletter_subscribed = data.newsletter_subscribed;
	this.password = data.password;
	this.settings = data.settings;
}

User.prototype.toJSON = function() {
	return {
		id: this.id,
		birthday: this.birthday,
		date_joined: this.date_joined,
		email: this.email,
		first_name: this.first_name,
		gender: this.gender,
		handle: this.handle,
		is_active: this.is_active,
		last_login: this.last_login,
		last_name: this.last_name,
		newsletter_subscribed: this.newsletter_subscribed,
		settings: this.settings
	};
};


function UserTag(data) {
	this.id = data.id;
	this.created = data.created;
	this.tag = data.tag;
	this.updated = data.updated;
}

UserTag.prototype.toJSON = function() {
	return {
		id: this.id,
		tag: this.tag
	};
};

UserTag.create = function(document) {
	return new UserTag(document);
};


module.exports = {
	Connection: Connection,
	Contact: Contact,
	Content: Content,
	Event: Event,
	Location: Location,
	Organization: Organization,
	Place: Place,
	Provider: Provider,
	Search: Search,
	Thing: Thing,
	User: User,
	UserTag: UserTag
};
