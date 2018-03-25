const moment = require('moment');
const type = require('type');


var currentTimezoneOffset = moment().format('Z');


function Geolocation(lat, lng) {
	this.lat = lat;
	this.lon = lng;
}


function Filter() {}

Filter.prototype = {
	and: function Filter$and(filter) {
		return new AndFilter(this).and(filter);
	},

	not: function Filter$not() {
		return new NotFilter(this);
	},

	or: function Filter$or(filter) {
		return new OrFilter(this).or(filter);
	}
};


function AndFilter(filter) {
	this.And = [filter];
}

AndFilter.prototype = new Filter();

AndFilter.prototype.and = function AndFilter$and(filter) {
	this.And.push(filter);

	return this;
};

AndFilter.prototype.toDSL = function AndFilter$toDSL() {
	var i, context, dsl;

	dsl = {};

	dsl.and = context = [];

	for (i = 0; i < this.And.length; i++) {
		context.push(this.And[i].toDSL());
	}

	return dsl;
};


function OrFilter(filter) {
	this.Or = [filter];
}

OrFilter.prototype = new Filter();

OrFilter.prototype.or = function OrFilter$or(filter) {
	this.Or.push(filter);

	return this;
};

OrFilter.prototype.toDSL = function OrFilter$toDSL() {
	var i, context, dsl;

	dsl = {};

	dsl.or = context = [];

	for (i = 0; i < this.Or.length; i++) {
		context.push(this.Or[i].toDSL());
	}

	return dsl;
};


function NotFilter(filter) {
	this.not = filter;
}

NotFilter.prototype = new Filter();

NotFilter.prototype.not = function NotFilter$not() {
	return this.not;
};

NotFilter.prototype.toDSL = function NotFilter$toDSL() {
	return {
		not: this.not.toDSL()
	};
};


function BoolFilter() {
	this._must = [];
	this._must_not = [];
	this._should = [];
}

BoolFilter.prototype = new Filter();

BoolFilter.prototype.must = function BoolFilter$must(filter) {
	//if (filter instanceof NotFilter) {
	//	this._must_not.push(filter.filter);
	//}
	//else {
	//	this._must.push(filter);
	//}

	this._must.push(filter);

	return this;
};

BoolFilter.prototype.mustNot = function BoolFilter$mustNot(filter) {
	this._must_not.push(filter);

	return this;
};

BoolFilter.prototype.should = function BoolFilter$should(filter) {
	this._should.push(filter);

	return this;
};

BoolFilter.prototype.toDSL = function BoolFilter$toDSL() {
	var i, context, dsl;

	dsl = {};

	if (this._must.length > 0) {
		context = dsl.must = [];

		for (i = 0; i < this._must.length; i++) {
			context.push(this._must[i].toDSL());
		}
	}

	if (this._must_not.length > 0) {
		context = dsl.must_not = [];

		for (i = 0; i < this._must_not.length; i++) {
			context.push(this._must_not[i].toDSL());
		}
	}

	if (this._should.length > 0) {
		context = dsl.should = [];

		for (i = 0; i < this._should.length; i++) {
			context.push(this._should[i].toDSL());
		}
	}

	return {
		bool: dsl
	};
};


function GeoFilter(field, distance, point) {
	this.search_field = field;
	this.distance = distance;
	this.points = point;
}

GeoFilter.prototype = new Filter();

GeoFilter.prototype.addPoint = function GeoFilter$addPoint(point) {
	if (this.points == null) {
		this.points = [];
	}
	else if (this.points instanceof Geolocation) {
		this.points = [this.points];
	}

	this.points.push(point);

	return this;
};

GeoFilter.prototype.toDSL = function Geo$toDSL() {
	var context, dsl;

	dsl = {};

	if (this.points instanceof Geolocation) {
		dsl.geo_distance = context = {
			distance: this.distance
		};
		context[this.search_field] = this.points;
	}
	else {
		dsl.geo_polygon = context = {};
		context[this.search_field] = {
			points: this.points
		};
	}

	return dsl;
};


function MatchFilter(field, value) {
	this.search_field = field;
	this.value = value;
}

MatchFilter.prototype = new Filter();

MatchFilter.prototype.toDSL = function MatchFilter$toDSL() {
	var context, dsl;

	dsl = {};

	dsl.match = context = {};
	context[this.search_field] = this.value;

	return dsl;
};


function RangeFilter(field) {
	this.search_field = field;
}

RangeFilter.prototype = new Filter();

RangeFilter.prototype.gt = function RangeFilter$gt(value) {
	this._gt = value;

	return this;
};

RangeFilter.prototype.gte = function RangeFilter$gte(value) {
	this._gte = value;

	return this;
};

RangeFilter.prototype.lt = function RangeFilter$lt(value) {
	this._lt = value;

	return this;
};

RangeFilter.prototype.lte = function RangeFilter$lte(value) {
	this._lte = value;

	return this;
};

RangeFilter.prototype.since = function RangFilter$since(value) {
	this._since = {
		number: value.number,
		unit: value.unit
	};

	return this;
};

RangeFilter.prototype.exactly = function RangFilter$exactly(value) {
	this._exactly = {
		number: value.number,
		unit: value.unit
	};

	return this;
};

RangeFilter.prototype.toDSL = function RangeFilter$toDSL() {
	var context, dsl, dateformat;

	dsl = {};
	dateformat = false;

	dsl.range = context = {};
	context[this.search_field] = context = {};

	if (this._lt) {
		context.lt = this._lt;

		if (type(this._lt) === 'date') {
			dateformat = true;
		}
	}
	else if (this._lte) {
		context.lte = this._lte;

		if (type(this._lte) === 'date') {
			dateformat = true;
		}
	}

	if (this._gt) {
		context.gt = this._gt;

		if (type(this._gt) === 'date') {
			dateformat = true;
		}
	}
	else if (this._gte) {
		context.gte = this._gte;

		if (type(this._gte) === 'date') {
			dateformat = true;
		}
	}

	if (this._since) {
		context.gte = moment().startOf('day').subtract(this._since.number, this._since.unit).toDate();

		if (type(context.gte) === 'date') {
			dateformat = true;
		}
	}

	if (this._exactly) {
		context.gte = moment().startOf('day').subtract(this._exactly.number, this._exactly.unit).toDate();
		context.lte = moment().endOf('day').subtract(this._exactly.number, this._exactly.unit).toDate();

		if (type(context.gte) === 'date' && type(context.lte) === 'date') {
			dateformat = true;
		}
	}

	if (dateformat) {
		context.format = 'date_time';
		//context.format = 'yyyy-MM-dd\'T\'HH:mm\'Z\'';
		context.time_zone = currentTimezoneOffset;
	}

	return dsl;
};


function TermFilter(field, value) {
	this.search_field = field;
	this.value = value;
}

TermFilter.prototype = new Filter();

TermFilter.prototype.toDSL = function TermFilter$toDSL() {
	var context, dsl;

	dsl = {};

	dsl.term = context = {};
	context[this.search_field] = this.value;

	return dsl;
};


module.exports = {
	Geolocation: Geolocation,

	AndFilter: AndFilter,
	OrFilter: OrFilter,

	BoolFilter: BoolFilter,
	GeoFilter: GeoFilter,
	MatchFilter: MatchFilter,
	RangeFilter: RangeFilter,
	TermFilter: TermFilter
};
