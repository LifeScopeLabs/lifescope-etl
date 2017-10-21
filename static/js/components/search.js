const Promise = require('bluebird');
const $ = require('jquery');
const _ = require('lodash');
const cookies = require('cookies');
const debounce = require('debounce');
const filters = require('filters');
const moment = require('moment');
const objects = require('objects');
const throttle = require('throttle');
require('datetimepicker');
require('jquery-deparam');
require('jquery-deserialize');


var filterDefaults = {};

var ACTIVE_GEO_FILL_COLOR = '#ff9933';
var PASSIVE_GEO_FILL_COLOR = '#f06eaa';

var MAX_FILTER_WIDTH_FRACTION = 0.3;
var RESIZE_DEBOUNCE = 250;  // ms

var $overflowCounter = $('<div>');

var currentSearch;
var activeFilter;
var exports;
var settings = {};
var queryChanged = false;

var protocol = 'https';
var domain = 'app.lifescope.io';

/**
 * A constructor that abstracts serializing search filters.
 *
 * @constructor
 * @param {String} name The name for the filter.
 * @param {String} type The type of the filter.
 * @param {Object} data The serialized form data associated with the filter.
 */
function Filter(name, type, data) {
	this.name = name || '';
	this.type = type;

	if (data) {
		this.data = data;
	}
	else {
		this.data = _.cloneDeep(filterDefaults[type]);
	}
}

Object.defineProperty(Filter.prototype, 'transient', {
	enumerable: true,
	get: function() {
		var transient, type;

		transient = true;
		type = this.type;

		if (type === 'who') {
			if (this.data.contact !== '' || this.data.interaction !== '') {
				transient = false;
			}
		}
		else if (type === 'what') {
			if (this.data.type !== '') {
				transient = false;
			}
		}
		else if (type === 'when') {
			if (this.data.interaction === 'exact') {
				if (this.data.from !== '' || this.data.to !== '') {
					transient = false;
				}
			}
			else if (this.data.interaction === 'relative') {
				if (this.data['relative-number'] !== '') {
					transient = false;
				}
			}
		}
		else if (type === 'connector') {
			if (this.data.type === 'provider') {
				if (this.data.provider !== '') {
					transient = false;
				}
			}
			else if (this.data.type === 'connection') {
				if (this.data.connection !== '') {
					transient = false;
				}
			}
		}
		//TODO: Uncomment when where filters are re-integerated
		//else if (type === 'where') {
		//	transient = false;
		//}

		return transient;
	}
});

/**
 * Adds a the filter instance to the DOM.
 *
 * @returns {jQuery.fn.init} A jQuery result set containing the newly created DOM element correlating to the new
 *     Filter.
 */
Filter.prototype.add = function Filter$add() {
	var coordinates, distance, newFilter, latlng, layerKeys, layer, layers, response, type, $el, $whereFilter;

	// You need to deactivate an active where filter regardless of the new filter's type.
	if (activeFilter && activeFilter.data('filter').type === 'where') {
		$(activeFilter.data('geofilter').element).attr('fill', PASSIVE_GEO_FILL_COLOR);
	}

	if (activeFilter && activeFilter.data('filter').transient) {
		$('.filter.active').remove();
		activeFilter = null;
	}
	else {
		// Save the active filter (if there is one).
		Filter.save();
	}

	// Clear out the filter editor (hide the form inputs and the independent name input).
	reset();

	$el = $('<div><span></span><i class="fa fa-close"></i></div>')
		.addClass('filter')
		.data('filter', this);

	// Sets the filter bubble name. Defaults to the capitalized type.
	$el.find('span')
		.text(this.name || capitalize(this.type));

	// Append the new filter DOM element to the list pane.
	if ($('#search-bar').hasClass('expanded')) {
		$('#filter-list').append($el);
	}
	else {
		$('#filters').append($el);
		compactOverflowFilters();
	}

	// Handle the where filter special case.
	if (this.type === 'where') {
		coordinates = [];
		latlng = [];
		$whereFilter = $('form.where');

		if (Array.isArray(values.points)) {
			type = 'polygon';

			_.forEach(values.points, function(coords) {
				coordinates.push([coords.lat, coords.lon]);
				latlng.push({
					lat: coords.lat,
					lng: coords.lon
				});
			});

			response = leaflet.polygon(coordinates).addTo(map.layers.draw);
		}
		else {
			type = 'circle';

			coordinates = [values.points.lat, values.points.lon];
			distance = parseFloat(values.distance.replace('km', '')) * 1000;
			response = leaflet.circle(coordinates, distance).addTo(map.layers.draw);
			latlng = [{
				lat: values.points.lat,
				lng: values.points.lon
			}];
		}

		newFilter = {
			id: response._leaflet_id,
			type: type,
			layer: response,
			element: response._path,
			coordinates: latlng
		};

		map.geofilters[response._leaflet_id] = newFilter;

		$(document).trigger({
			type: 'geofilter:create',
			filter: newFilter,
			map: map,
			preventClick: true
		});

		//Create a what filter by triggering a click event on its filter creation button.
		$('#filter-buttons').find('[data-type="where"]').addClass('active');

		$whereFilter.find('input[name="estimated"]').prop('checked', estimated);
		$whereFilter.find('input[value="' + insideOutside + '"]').prop('checked', true);
	}

	return $el;
};

/**
 * Loads the filter instance into the active search filter form.
 */
Filter.prototype.load = function Filter$load() {
	var tempTime, whoType, $connectorForm, $timeElement, $whenForm, $whoForm;

	//Deserialize can't handle unchecked checkboxes, as they are not serialized in the first place.
	//Uncheck any that are present so that filters where they weren't checked aren't checked by mistake.
	//If you don't, then if the checkbox on the form was checked from a previous filter, it will remain so
	//on the newly-selected one.
	$('#filter-values input[type="checkbox"]').prop('checked', false);

	$connectorForm = $('form.connector');
	$whenForm = $('form.when');
	$whoForm = $('form.who');

	// Load the form data into the right form.
	$('form.' + this.type).deserialize(this.data);
	// Show the right form.
	$('#filter-values').attr('class', this.type);

	if (this.type === 'who') {
		$whoForm.find('.radio.active').removeClass('active');
		whoType = $whoForm.find('input[type="radio"]:checked').attr('id');
		$whoForm.find('label[for="' + whoType + '"]').addClass('active');
	}

	if (this.type === 'when') {
		if (this.data.interaction === 'exact') {
			$whenForm.find('#when-exact').prop('checked', true);
			$whenForm.find('.exact-controls').removeClass('hidden');
			$whenForm.find('.relative-controls').addClass('hidden');
			$whenForm.find('label[for="when-exact"]').addClass('active');
			$whenForm.find('label[for="when-relative"]').removeClass('active');

			if ($whenForm.find('.form-control[name="from"]').val().length > 0) {
				$timeElement = $whenForm.find('.form-control[name="from"]');
				tempTime = moment(new Date($timeElement.val())).format('MM/DD/YYYY h:mm A');
				$('#from').data('DateTimePicker').date(tempTime);
			}

			if ($whenForm.find('.form-control[name="to"]').val().length > 0) {
				$timeElement = $whenForm.find('.form-control[name="to"]');
				tempTime = moment(new Date($timeElement.val())).format('MM/DD/YYYY h:mm A');
				$('#to').data('DateTimePicker').date(tempTime);
			}
		}
		else {
			$whenForm.find('#when-relative').prop('checked', true);
			$whenForm.find('.exact-controls').addClass('hidden');
			$whenForm.find('.relative-controls').removeClass('hidden');
			$whenForm.find('label[for="when-exact"]').removeClass('active');
			$whenForm.find('label[for="when-relative"]').addClass('active');
		}
	}

	if (this.type === 'connector') {
		if (this.data.type === 'provider') {
			$connectorForm.find('#provider').prop('checked', true);
			$connectorForm.find('.provider').removeClass('hidden');
			$connectorForm.find('.connection').addClass('hidden');
			$connectorForm.find('label[for="provider"]').addClass('active');
			$connectorForm.find('label[for="connection"]').removeClass('active');
		}
		else {
			$connectorForm.find('#connection').prop('checked', true);
			$connectorForm.find('.provider').addClass('hidden');
			$connectorForm.find('.connection').removeClass('hidden');
			$connectorForm.find('label[for="provider"]').removeClass('active');
			$connectorForm.find('label[for="connection"]').addClass('active');
		}
	}

	// Add the filter name.
	$('#filter-name').removeClass('hidden')
		.find('input')
		.attr('placeholder', this.type.toUpperCase())
		.val(this.name || '');

	// Activate the filter type control, disable all others (i.e. turn the things orange).
	$('#filter-editor .control[data-type="' + this.type + '"]').addClass('active')
		.siblings('.active')
		.removeClass('active');
};

/**
 *
 * @param {Object} serialized
 * @returns {Filter} A new filter using the configuration
 */
Filter.deserialize = function Filter$deserialize(serialized) {
	return new Filter(serialized.name, serialized.type, serialized.data);
};

/**
 * Gets a new Filter instance that corresponds to the advanced search filter parameters.
 *
 * @returns {Filter} A new filter instance.
 */
Filter.get = function Filter$get() {
	var data, name, type;

	type = $('#filter-values').attr('class');
	name = $('#filter-name input').val();

	data = {};
	$('form.' + type).serializeArray().map(function(d) {
		data[d.name] = d.value;
	});

	if (type === 'when') {
		if (data.to.length > 0) {
			data.to = moment(new Date(data.to)).utc().toJSON();
		}

		if (data.from.length > 0) {
			data.from = moment(new Date(data.from)).utc().toJSON();
		}
	}

	return new Filter(name, type, data);
};

/**
 *
 */
Filter.save = function Filter$save() {
	var filter;

	if (activeFilter) {
		filter = Filter.get();
		activeFilter.data('filter', filter);
	}
};

/**
 * Capitalizes the first letter for a string.
 *
 * @private
 * @param {String} s The string to capitalize.
 * @returns {String} The capitalized string.
 */
function capitalize(s) {
	return s[0].toUpperCase() + s.slice(1);
}

/**
 * Clears the search bar completely.
 */
function clear() {
	$('#filter-list').empty();
	$('#filters').empty();
	reset();
	shrink();

	currentSearch = null;
	setQuery(null);
	setFavorited(false);

	$(exports).triggerHandler('clear');
}

/**
 * Reduces the number of fully displayed filters to ensure that search bar still has enough typeable area. The
 * compacted filters are represented by an overflow "filter" with the number of filters that are currently hidden.
 *
 * @private
 */
function compactOverflowFilters() {
	var hideCount, hideIndex, maxWidth, width, $filters;

	if ($('#search-bar').hasClass('expanded')) {
		return;
	}

	maxWidth = MAX_FILTER_WIDTH_FRACTION * $('#search-bar').width();
	width = 0;
	$filters = $('#filters > .filter');

	$filters.each(function(i, d) {
		var elemWidth;

		elemWidth = $(d).removeClass('hidden').width();

		if (elemWidth + width > maxWidth) {
			hideIndex = i;

			return false;
		}

		width += elemWidth;
	});

	if (typeof hideIndex !== 'undefined') {
		hideCount = $filters.length - hideIndex;

		$filters.slice(hideIndex).addClass('hidden');
		$overflowCounter.text('+ ' + hideCount)
			.appendTo('#filter-overflow-count');
	}
	else {
		$('#filter-overflow-count').empty();
	}
}

/**
 * Configures the search module with various settings and behaviors.
 *
 * @param {Object} options
 *     @param {cartano.Map} [options.map] Sets the active map for geofilter manipulation.
 */
function configure(options) {
	if (options.map) {
		settings.map = options.map;
	}
}

/**
 * Deletes a search by clearing the name, icon, and icon color.
 *
 * @param {String} [id] The ID of the search to favorite.
 * @returns {Promise} A promise that is resolved when the specified search is unfavorited on the server.
 */
function del(id) {
	if (currentSearch && currentSearch.id || id) {
		return new Promise(function(resolve, reject) {
			$.ajax({
				url: protocol + '://' + domain + '/api/searches/' + id,
				method: 'DELETE',
				headers: {
					'X-CSRF-Token': window.csrftoken
				}
			}).done(function() {
				resolve(null);
			}).fail(function(req) {
				var error;

				error = new Error(req.statusText);
				error.code = req.status;

				reject(error);
			});
		});
	}
	else {
		return Promise.resolve(null);
	}
}

/**
 * Checks to see if there is a current search that matches the existing search parameters (i.e. filters, query).
 *
 * @returns {Promise} A promise that is resolved with the search that matches the current filters and query or
 * `null` if the search doesn't exist.
 */
function exists() {
	var data, filters, query;

	data = {};
	filters = getFilters();
	query = getQuery();
	data.filters = filters;

	if (query) {
		data.query = query;
	}

	return new Promise(function(resolve, reject) {
		$.ajax({
			url: protocol + '://' + domain + '/api/searches',
			type: 'SEARCH',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify(data)
		}).done(function(data, status, req) {
			switch(req.status) {
				case 200:
					resolve(data);
					break;
				default:
					resolve(null);
					break;
			}
		}).fail(function(req) {
			var error;

			error = new Error(req.statusText);
			error.code = req.status;

			reject(error);
		});
	}).tap(function(saved) {
		updateActiveSearch(saved);
		queryChanged = false;
		$(exports).triggerHandler('changed');
	});
}

/**
 * Expands the search bar with the advanced filter search toolbar. This performs DOM manipulation.
 */
function expand() {
	$('#filters > .filter').appendTo('#filter-list')
		.removeClass('hidden');

	$('#advanced i').removeClass('fa-caret-down').addClass('fa-caret-up');
	$('#search-bar').addClass('expanded');
	$('#filter-overflow-count').empty();

	if (activeFilter && activeFilter.data('type') === 'where') {
		$(activeFilter.data('geofilter').element).attr('fill', ACTIVE_GEO_FILL_COLOR);
	}

	$(exports).triggerHandler('expand');
	$('body').addClass('search-expand');
}

/**
 * Favorites a search by saving the name, icon, and icon color. If no `id` is supplied, defaults to the current,
 * active search.
 *
 * @param {Object|String} [params] An object containing save parameters for the search.
 * @param {String} [params.id] The ID of the search to favorite.
 * @param {String} [params.name} The name of the search to save.
 * @param {String} [params.icon} The icon of the search.
 * @param {String} [params.icon_color} The color of the icon.
 * @returns {Promise} A promise that is resolved when the specified search is favorited on the server.
 */
function favorite(params) {
	if (!params) {
		params = {};
	}
	else if (typeof params === 'string') {
		params = {
			id: params
		};
	}

	params.favorited = true;

	if (currentSearch && currentSearch.id || params.id) {
		if (!params.id) {
			params.id = currentSearch.id;
		}

		return favoriteHelper(params);
	}
	else {
		// `.save()` takes care of the filters and query itself.
		currentSearch = params;

		return save().then(function(saved) {
			// Since we created a "fake" current search, just set the "real" one that comes back from `.save()` to
			// `currentSearch` now that we have it.
			updateActiveSearch(saved);

			return Promise.resolve({
				id: saved.id
			});
		});
	}
}

/**
 * A helper function to actually run the AJAX PATCH request necessary to update the search.
 *
 * @private
 * @param {Object} [params] An object containing save parameters for the search.
 * @param {String} [params.id] The ID of the search to favorite.
 * @param {String} [params.name} The name of the search to save.
 * @param {String} [params.icon} The icon of the search.
 * @param {String} [params.icon_color} The color of the icon.
 * @returns {Promise} A promise that is resolved when the specified search is updated on the server.
 */
function favoriteHelper(params) {
	var data;

	data = _.cloneDeep(params);

	delete data.id;

	return new Promise(function(resolve, reject) {
		$.ajax({
			url: protocol + '://' + domain + '/api/searches/' + params.id,
			type: 'PATCH',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify(data),
			headers: {
				'X-CSRF-Token': window.csrftoken
			}
		}).done(function(data) {
			resolve(data);
		}).fail(function(req) {
			var error;

			error = new Error(req.statusText);
			error.code = req.status;

			reject(error);
		});
	});
}

/**
 *
 * @private
 * @param type {String} The type of filter to generate
 * @param key {String} The key of the filter
 * @param value {String} The value of the filter
 */
function generateFilter(type, key, value) {
	return new filters.BoolFilter().must(new filters.OrFilter(new filters[type](key, value))).toDSL();
}

/**
 * Returns
 *
 * @private
 * @returns {Array} A list of all the current filters attached to the search.
 */
function getFilters() {
	var i, filter, filters, $set;

	// We're storing the Filter instances on the $.data of the filter bubbles, so iterate over all of them and
	// return the list.
	$set = $('#search-bar .filter');
	filters = [];

	for (i = 0; i < $set.length; i++) {
		filter = $set.eq(i).data('filter');

		if (filter.transient === false) {
			filters.push(filter);
		}
	}

	return filters;
}

/**
 * Returns the DSL representation of the current filters attached to the search.
 *
 * @private
 * @returns {Object}
 */
function assembleFilters() {
	var i, bool, connectorFilters, data, filter, filters, filterList, operand, query, slugifiedTag, tagFilters, tags, type, whatFilters, whenFilters, whereFilters,
		whoFilters;

	//bool = new filters.BoolFilter();
	filters = {};
	filterList = getFilters();

	query = getQuery();
	tags = query.match(/#[A-Za-z0-9-]+/g);

	for (i = 0; i < filterList.length; i++) {
		type = filterList[i].type;
		data = filterList[i].data;

		// FIXME: Pluck geofilter properties.

		if (type === 'who') {
			if (data.contact) {
				filter = {
					$or: [
						{
							name: data.contact
						},
						{
							handle: data.contact
						}
					]
				};
			}

			if (data.interaction) {
				operand = {
					contact_interaction_type: data.interaction
				};

				filter = filter ? {
					$and: [
						operand,
						filter
					]
				} : operand;
			}

			if (filter != null) {
				if (whoFilters) {
					whoFilters.push(filter);
				}
				else {
					whoFilters = [
						filter
					];
				}
			}
		}
		else if (type === 'what') {
			if (data.type) {
				filter = {
					type: data.type
				};
			}

			if (filter != null) {
				if (whatFilters) {
					whatFilters.push(filter);
				}
				else {
					whatFilters = [
						filter
					];
				}
			}
		}
		else if (type === 'when') {
			if ((data.from && data.from.length > 0) || (data.to && data.to.length > 0) || (data.interaction && data['relative-number'] && data['relative-number'].length > 0 && parseInt(data['relative-number']) > 0)) {
				filter = {
					datetime: {}
				};
			}

			if (data.interaction === 'exact') {
				if (data.from) {
					filter.datetime.$gte = data.from;
				}

				if (data.to) {
					filter.datetime.$lte = data.to;
				}
			}
			else if (data.interaction === 'relative' && data['relative-number'].length > 0 && parseInt(data['relative-number']) > 0) {
				if (data['since-exactly'] === 'since') {
					filter.datetime = {
						$gte: moment().subtract(parseInt(data['relative-number']), data.units)
					};
				}
				else if (data['since-exactly'] === 'exactly') {
					filter.datetime = {
						$gte: moment().subtract(parseInt(data['relative-number']), data.units),
						$lte: moment().subtract(parseInt(data['relative-number'] - 1), data.units)
					};
				}
			}

			if (filter != null) {
				if (data.estimated) {
					operand = {
						datetime: {}
					};

					if (data.interaction === 'exact') {
						if (data.from) {
							operand.datetime.$gte = data.from;
						}

						if (data.to) {
							operand.datetime.$lte = data.to
						}
					}
					else if (data.interaction === 'relative' && data['relative-number'].length > 0) {
						if (data['since-exactly'] === 'since') {
							operand.datetime = {
								$gte: moment().subtract(parseInt(data['relative-number']), data.units)
							};
						}
						else if (data['since-exactly'] === 'exactly') {
							operand.datetime = {
								$gte: moment().subtract(parseInt(data['relative-number']), data.units),
								$lte: moment().subtract(parseInt(data['relative-number'] - 1), data.units)
							};
						}
					}

					filter = {
						$or: [
							operand,
							filter
						]
					};
				}

				if (whenFilters) {
					whenFilters.push(filter);
				}
				else {
					whenFilters = [
						filter
					];
				}
			}
		}
		else if (type === 'where') {
			geofilter = $d.data('geofilter');

			if (geofilter.type === 'circle') {
				coordinates = geofilter.coordinates[0];
				radius = (geofilter.layer.getRadius() / 1000).toFixed(3) + 'km';

				filter = new filters.GeoFilter('location.geolocation', radius, new filters.Geolocation(coordinates.lat, coordinates.lng));
			}
			else {
				coordinates = geofilter.coordinates;
				filter = new filters.GeoFilter('location.geolocation');

				for (i = 0; i < coordinates.length; i++) {
					filter.addPoint(new filters.Geolocation(coordinates[i].lat, coordinates[i].lng));
				}
			}

			if (data.geometry === 'outside') {
				filter = filter.not();
			}

			if (!data.estimated) {
				operand = new filters.TermFilter('location.estimated', false);
				filter = filter.and(operand);
			}

			if (filter != null) {
				if (whereFilters) {
					whereFilters.push(filter);
				}
				else {
					whereFilters = [
						filter
					];
				}
			}
		}
		else if (type === 'connector') {
			if (data.connection) {
				filter = {
					connection: data.connection
				};
			}
			else if (data.provider) {
				filter = {
					provider_name: data.provider.toLowerCase()
				}
			}

			if (filter != null) {
				if (connectorFilters) {
					connectorFilters.push(filter);
				}
				else {
					connectorFilters = [
						filter
					];
				}
			}
		}
	}

	if (tags != null) {
		for (i = 0; i < tags.length; i++) {
			slugifiedTag = tags[i].slice(1).toLowerCase().replace(/[^a-zA-Z0-9-]+/g, '-');

			if (tagFilters) {
				connectorFilters.push(slugifiedTag);
			}
			else {
				tagFilters = [
					slugifiedTag
				];
			}
		}
	}

	if (connectorFilters != null && connectorFilters.length > 0) {
		filters.connectorFilters = connectorFilters;
	}

	if (tagFilters != null && tagFilters.length > 0) {
		filters.tagFilters = tagFilters;
	}

	if (whoFilters != null && whoFilters.length > 0) {
		filters.whoFilters = whoFilters;
	}

	if (whatFilters != null && whatFilters.length > 0) {
		filters.whatFilters = whatFilters;
	}

	if (whenFilters != null && whenFilters.length > 0) {
		filters.whenFilters = whenFilters;
	}

	if (whereFilters != null && whereFilters.length > 0) {
		filters.whereFilters = whereFilters;
	}

	return filters;
}

/**
 * Returns the string value of the query text box.
 *
 * @private
 * @returns {String}
 */
function getQuery() {
	return $('#search-query').val();
}

/**
 * Loads the search with the specified ID. If no ID is specified, attempts to load the search with the current list
 * of filters and the search query. If the search exists, the query parameter `qid` is appended or updated with the
 * supplied ID.
 *
 * @param {String} [id] The ID of the saved search.
 * @returns {Promise} A promise that is resolved when the search is loaded from the server.
 */
function load(id) {
	var promise;

	if (id == null) {
		promise = new Promise(function(resolve, reject) {
			var data;

			data = {
				type: 'recent',
				limit: 1,
				offset: 0
			};

			$.ajax({
				url: protocol + '://' + domain + '/api/searches',
				type: 'GET',
				dataType: 'json',
				contentType: 'application/json',
				data: data
			}).done(function(data) {
				if (data && data.results.length > 0) {
					resolve(data.results[0]);
				}
				else {
					resolve(null);
				}
			}).fail(function(req) {
				var error;

				error = new Error(req.statusText);
				error.code = req.status;

				reject(error);
			});
		});
	}
	else {
		promise = new Promise(function(resolve, reject) {
			$.ajax({
				url: protocol + '://' + domain + '/api/searches/' + id,
				type: 'GET',
				contentType: 'application/json'
			}).done(function(data) {
				resolve(data);
			}).fail(function(req) {
				var error;

				error = new Error(req.statusText);
				error.code = req.status;

				reject(error);
			});
		});
	}

	return promise.tap(function(saved) {
		var i, filter;

		clear();

		if (saved) {
			for (i = 0; i < saved.filters.length; i++) {
				filter = Filter.deserialize(saved.filters[i]);
				filter.add();
			}

			currentSearch = saved;

			setQuery(saved.query);
			setFavorited(saved.favorited);
		}
	});
}

/**
 * Clears the filter editor by removing the form data from the currently displayed filter and removes the "active"
 * class from all filter types.
 */
function reset() {
	var $connectorForm, $whenForm, $whoForm;

	$('#filter-values form').trigger('reset');
	$('#filter-values').removeAttr('class');

	$('#filter-name').addClass('hidden')
		.find('input').val('');

	$('.control.active').removeClass('active');

	$whoForm = $('#filter-values form.who');
	$whoForm.find('.radio.active').removeClass('active');
	$whoForm.find('label[for="who-type-1"]').addClass('active');

	// Handle special cases for when form.
	$whenForm = $('#filter-values form.when');
	$whenForm.find('.exact-controls').removeClass('hidden');
	$whenForm.find('.relative-controls').addClass('hidden');
	$whenForm.find('#from').data('DateTimePicker').date(null);
	$whenForm.find('#to').data('DateTimePicker').date(null);
	$whenForm.find('label[for="when-exact"]').addClass('active');
	$whenForm.find('label[for="when-relative"]').removeClass('active');

	// Handle special cases for connector form.
	$connectorForm = $('#filter-values form.connector');
	$connectorForm.find('.provider').removeClass('hidden');
	$connectorForm.find('.connection').addClass('hidden');
	$connectorForm.find('label[for="provider"]').addClass('active');
	$connectorForm.find('label[for="connection"]').removeClass('active');
}

/**
 * Saves the current search.
 *
 * @returns {Promise} A promise that is resolved with a search ID object after it is saved.
 */
function save() {
	var data, filters, query;

	data = {};
	filters = getFilters();
	query = getQuery();
	data.filters = filters;

	if (query) {
		data.query = query;
	}

	if (currentSearch) {
		data.name = currentSearch.name || null;
		data.favorited = currentSearch.favorited === true;
		data.icon = currentSearch.icon || null;
		data.icon_color = currentSearch.icon_color || null;
	}

	return new Promise(function(resolve, reject) {
		$.ajax({
			url: protocol + '://' + domain + '/api/searches',
			type: 'POST',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify(data),
			headers: {
				'X-CSRF-Token': window.csrftoken
			}
		}).done(function(data) {
			resolve(data);
		}).fail(function(req) {
			var error;

			error = new Error(req.statusText);
			error.code = req.status;

			reject(error);
		});
	});
}

/**
 * Sets the favorited status of the query text box.
 *
 * @param {Boolean} val
 */
function setFavorited(val) {
	var $favorited;

	$favorited = $('#search-favorited');

	if (val) {
		$favorited.addClass('filled');
	}
	else {
		$favorited.removeClass('filled');
	}
}

/**
 * Sets the string value of the query text box.
 *
 * @private
 * @param {*} [val] The value to set in the query text box.
 * @param {Boolean} [trigger=false] A flag indicating whether or not to fire the change event on the search query.
 */
function setQuery(val, trigger) {
	var $query;

	if (val == null) {
		val = '';
	}

	$query = $('#search-query');
	$query.val(String(val));

	if (trigger === true) {
		$query.trigger('change');
	}
}

/**
 * Shrinks the search bar by hiding the advanced filter search toolbar. This performs DOM manipulation.
 */
function shrink() {
	if (activeFilter && activeFilter.data('filter').transient) {
		$('.filter.active').remove();
		activeFilter = null;
		reset();
		$('#filter-done').hide();
	}
	else {
		// Save the active filter (if there is one).
		Filter.save();
	}

	$('#advanced i').removeClass('fa-caret-up').addClass('fa-caret-down');
	$('#search-bar').removeClass('expanded');
	$('#filter-list > .filter').appendTo('#filters');

	compactOverflowFilters();

	if (activeFilter && activeFilter.data('type') === 'where') {
		$(activeFilter.data('geofilter').element).attr('fill', PASSIVE_GEO_FILL_COLOR);
	}

	$(exports).triggerHandler('shrink');
	$('body').removeClass('search-expand');
}

/**
 * Unfavorites a search by clearing the name, icon, and icon color. If no `id` is supplied, defaults to the current,
 * active search.
 *
 * @param {String} [id] The ID of the search to favorite.
 * @returns {Promise} A promise that is resolved when the specified search is unfavorited on the server.
 */
function unfavorite(id) {
	if (currentSearch && currentSearch.id || id) {
		if (!id) {
			id = currentSearch.id;
		}

		return favoriteHelper({
			id: id,
			favorited: false
		});
	}
	else {
		return Promise.resolve(null);
	}
}

/**
 * Sets the internal reference to the current search. Renames any filters as appropriate. Fires the "update" event
 * on the module.
 *
 * @private
 * @param {Object} searchObj The search object returned from API calls (e.g. `check`, `save`, etc.).
 */
function updateActiveSearch(searchObj) {
	var i, filter, search, $filter, $filters;

	$filters = $('#search-bar').find('.filter');

	// Save a pointer to the current search.
	currentSearch = searchObj || null;

	if (searchObj) {
		setFavorited(searchObj.favorited);

		if (searchObj.filters) {
			for (i = 0; i < searchObj.filters.length; i++) {
				filter = searchObj.filters[i];
				$filter = $filters.eq(i);

				$filter.data('filter').name = filter.name;
				$filter.find('span').text(filter.name || capitalize(filter.type));

				// Only need to update the name because the filter data should match.
				if ($filter.hasClass('active')) {
					$('#filter-values').find('#filter-name input[name="name"]').val(filter.name);
				}
			}
		}
	}
	else {
		setFavorited(false);
	}

	$(exports).triggerHandler('update', [searchObj]);
}

// Set up event listeners, etc.
$(document).ready(function() {
	// Set up form defaults.
	_.each(['who', 'what', 'when', 'where', 'connector'], function(type) {
		var data;

		filterDefaults[type] = data = {};

		$('form.' + type).clone().trigger('reset').serializeArray().map(function(d) {
			data[d.name] = d.value;
		});
	});

	// Queries for the user's connections and BitScoop's providers to populate the connector and provider filter DDL's.
	// Only providers used by the user's connections are shown.
	Promise.all([
		objects.connectionPromise,
		objects.providerPromise
	])
		.then(function() {
			var usedProviders, $select;

			usedProviders = {};

			$select = $('form.connector select[name="connection"]');

			$.each(objects.connections, function(i, d) {
				var providerName;

				if (d.auth.status.complete) {
					providerName = _.get(objects.providers, d.provider_id).name;

					$('<option>')
						.attr('value', d.id)
						.text(providerName + ' - ' + d.name)
						.appendTo($select);

					usedProviders[d.provider_id] = true;
				}
			});

			$select = $('form.connector select[name="provider"]');

			$.each(objects.providers, function(i, d) {
				if (usedProviders.hasOwnProperty(d.id)) {
					$('<option>')
						.attr('value', d.name.toLowerCase())
						.text(d.name)
						.appendTo($select);
				}
			});
		});

	// Deletes a filter when the "x" in the filter bubble is clicked.
	$('#search-bar').on('click', '.filter > .fa-close', function(e) {
		var filter, layer, map, $filter, $this = $(this);

		e.stopPropagation();

		$filter = $this.closest('div');
		filter = $filter.data('filter');

		if (activeFilter && $filter.get(0) === activeFilter.get(0)) {
			reset();
			activeFilter = null;
			$('#filter-done').hide();
		}

		if (filter.type === 'where') {
			// FIXME: Revisit geofilters to make sure they work with the new scheme.
			layer = $filter.data('geofilter').layer;
			map = $filter.data('map');
			map.object.removeLayer(layer);
		}

		$filter.remove();

		// Removing the filter might make the search identical to an existing search, so kick of the exists workflow.
		exists().catch();
	});

	// Opens the advanced search pane when a filter is clicked in the search bar itself with focus on the clicked
	// filter.
	$('#search-bar')
		.on('click', '#advanced', function(e) {
			var $icon, $this = $(this);

			$icon = $this.find('i');

			if ($icon.hasClass('fa-caret-down')) {
				expand();
			}
			else {
				shrink();
			}
		})
		.on('click', '#filters .filter', function(e) {
			expand();

			$(this).trigger('click');
		})
		// Or when the overflow counter is clicked defaulting to the last active filter (since one wasn't directly clicked).
		.on('click', '#filter-overflow-count', function(e) {
			e.stopPropagation();

			expand();
		});

	// When a filter bubble is clicked when the advanced search pane is expanded, "select" the clicked search. Click
	// events are simulated (and subsequently handled here as if they were real clicks) when search bubbles are clicked
	// in the search bar when the advanced search pane is collapsed.
	$('#search-bar').on('click', '#filter-list .filter', function(e) {
		var filter, type, $this = $(this);

		// If you're clicking on the current active filter, do nothing.
		if (activeFilter && activeFilter.get(0) === this) {
			return false;
		}

		// "Deactivate" the current geofilter by changing its color to the passive color.
		if (activeFilter) {
			filter = activeFilter.data('filter');

			if (filter.type === 'where') {
				$(activeFilter.data('geofilter').element).attr('fill', PASSIVE_GEO_FILL_COLOR);
			}
		}

		// Save the current filter since we're about to swap to a new one.
		Filter.save();

		activeFilter = $this;
		filter = $this.data('filter');

		// "Activate" the new geofilter by changing its color to the active color.
		if (filter.type === 'where') {
			$(activeFilter.data('geofilter').element).attr('fill', ACTIVE_GEO_FILL_COLOR);
		}

		// Add the active class to the clicked filter bubble while removing it from all the others.
		activeFilter.addClass('active')
			.siblings('.filter').removeClass('active');

		// Load the filter associated with the clicked filter bubble into the workflow.
		activeFilter.data('filter').load();
		$('#filter-done').show();
	});

	// Event listener for clicking on one of the five new filter buttons.
	$('#search-bar').on('click', '.control:not(.disabled)', function(e) {
		var data, filter, type, $el, $this = $(this);

		type = $this.data('type');
		filter = new Filter(null, type, null);

		$el = activeFilter = filter.add();

		$el.addClass('active')
			.siblings('.filter').removeClass('active');

		// Mark the clicked control as active and deactivate any other active control buttons.
		$('.control[data-type="' + type + '"]').addClass('active')
			.siblings('.active').removeClass('active');

		// Control what form is visible by adjusting the class name on this element.
		$('#filter-values').attr('class', type);

		// Adjust the visibility of the reused name input. Set the placeholder to the type of the active filter.
		$('#filter-name').removeClass('hidden')
			.find('input')
			.attr('placeholder', type.toUpperCase())
			.val('');

		$('#filter-done').show();
	});

	// Prevent filter forms from submitting and/or redirecting the user.
	$('#search-bar').on('submit', '#filter-values form', function(e) {
		e.preventDefault();

		return false;
	});

	// When a user clicks the exact when toggle, hide the relative time inputs.
	$('#search-bar').on('click', 'label[for="when-exact"]', function() {
		var $whenForm;

		$whenForm = $('form.when');

		$whenForm.find('.exact-controls').removeClass('hidden');
		$whenForm.find('.relative-controls').addClass('hidden');
		$whenForm.find('select[name="since-exactly"]').find('option[value="since"]').prop('selected', true);
		$whenForm.find('input[name="relative-number"]').val('');
		$whenForm.find('select[name="units"]').find('option[value="days"]').prop('selected', true);
		$whenForm.find('label[for="when-exact"]').addClass('active');
		$whenForm.find('label[for="when-relative"]').removeClass('active');
	});

	// When a user clicks the relative when toggle, hide the exact time inputs.
	$('#search-bar').on('click', 'label[for="when-relative"]', function() {
		var $whenForm;

		$whenForm = $('form.when');

		$whenForm.find('.exact-controls').addClass('hidden');
		$whenForm.find('.relative-controls').removeClass('hidden');
		$whenForm.find('#from').data('DateTimePicker').date(null);
		$whenForm.find('#to').data('DateTimePicker').date(null);
		$whenForm.find('label[for="when-exact"]').removeClass('active');
		$whenForm.find('label[for="when-relative"]').addClass('active');
	});

	// When a user clicks the provider toggle, hide the connection selection.
	$('#search-bar').on('click', '#provider', function(e) {
		var $connectorForm;

		$connectorForm = $('form.connector');

		$connectorForm.find('.provider').removeClass('hidden');
		$connectorForm.find('.connection').addClass('hidden');
		$connectorForm.find('select[name="connection"]').find('option:first-child').prop('selected', true);
		$connectorForm.find('label[for="provider"]').removeClass('active');
		$connectorForm.find('label[for="connection"]').addClass('active');
	});

	// When a user clicks the connection toggle, hide the provider selection.
	$('#search-bar').on('click', '#connection', function(e) {
		var $connectorForm;

		$connectorForm = $('form.connector');

		$connectorForm.find('.provider').addClass('hidden');
		$connectorForm.find('.connection').removeClass('hidden');
		$connectorForm.find('select[name="provider"]').find('option:first-child').prop('selected', true);
		$connectorForm.find('label[for="provider"]').addClass('active');
		$connectorForm.find('label[for="connection"]').removeClass('active');
	});

	$('#search-bar').on('click', 'label.radio', function(e) {
		var $this = $(this);

		$this.siblings('.radio').removeClass('active');
		$this.addClass('active');
	});

	$('#search-bar').on('click', '.estimated > label', function(e) {
		var $this = $(this);

		$this.toggleClass('active');
	});

	// Update the filter tag with any changes to the name input.
	$('#filter-name input').on('keydown keyup paste change', function(e) {
		var filter, name, $this = $(this);

		filter = activeFilter.data('filter');
		name = $this.val() || capitalize(filter.type);
		filter.name = name;

		activeFilter.find('span').text(name);
	});

	// When cartano fires the geofilter create event, create a new internal geofilter and associate it with that
	// geofilter.
	$(document).on('geofilter:create', function(e) {
		var filter, $filter;

		filter = new Filter(null, 'where', null);
		filter.geofilter = e.filter;
		filter.map = e.map;

		$filter = filter.add();

		$(geofilter.element).data('filter', $filter);

		if (!e.preventClick) {
			$filter.trigger('click');
		}
	});

	// When cartano fires the geofilter update event, update the internal filter associated with that geofilter.
	$(document).on('geofilter:update', function(e) {
		filter = $(e.target).data('filter');

		filter.geofilter = e.filter;

		$(filter).data('geofilter', e.filter);
	});

	// When cartano fires the geofilter delete event, remove the internal filter associated with that geofilter.
	$(document).on('geofilter:delete', function(e) {
		var filter, geofilter;

		geofilter = e.filter;
		filter = $(geofilter.element).data('filter');

		if (activeFilter && filter === activeFilter.get(0)) {
			reset();
		}

		$(filter).remove();

		_checkNewQuery();
		compactOverflowFilters();
	});

	// When a user draws a geofilter, shrink the advanced search pane if it's open, and then open it back up when
	// drawing ends.
	$(document).on('drawstart', function(e) {
		if ($('#search-bar').hasClass('expanded')) {
			shrink();

			$(this).one('drawend', expand);
		}
	});

	// When a search parameter changes (e.g. the text query or filters), initiate the saved search check workflow.
	$('#search-bar')
		.on('change', '#search-query', function() {
			queryChanged = true;

			exists().catch();
		})
		.on('change', '#filter-values form input, #filter-values form select', function() {
			Filter.save();

			exists().catch();
		});

	$('#search-bar').on('click', '#filter-done > button', function() {
		shrink();
		$('#search-button').trigger('click');
	});

	// Close the filter window if a user clicks on any area that isn't part of the advanced filters including the
	// empty space that's technically part of the DOM tree.
	$(document)
		.on('click', function(e) {
			var $this = $(e.target);

			if ($this.closest('#search-bar').length === 0) {
				shrink();
			}
		})
		.on('click', '#filter-controls', function(e) {
			if (e.target === $('#filter-controls').get(0)) {
				shrink();
			}
		});

	$('#from').datetimepicker({
		icons: {
			up: 'fa fa-chevron-up',
			down: 'fa fa-chevron-down',
			previous: 'fa fa-chevron-left',
			next: 'fa fa-chevron-right',
			time: 'fa fa-clock-o',
			date: 'fa fa-calendar',
			clear: 'fa fa-trash',
			close: 'fa fa-times'
		},
		showClear: true,
		showClose: true
	});

	$('#to').datetimepicker({
		useCurrent: false,
		icons: {
			up: 'fa fa-chevron-up',
			down: 'fa fa-chevron-down',
			previous: 'fa fa-chevron-left',
			next: 'fa fa-chevron-right',
			time: 'fa fa-clock-o',
			date: 'fa fa-calendar',
			clear: 'fa fa-trash',
			close: 'fa fa-times'
		},
		showClear: true,
		showClose: true
	});

	$('#from').on('dp.change', function(e) {
		$('#to').data('DateTimePicker').minDate(e.date);
	});

	$('#to').on('dp.change', function(e) {
		$('#from').data('DateTimePicker').maxDate(e.date);
	});

	// The datetimepicker has a stopImmediatePropagation on its input change. This manually triggers a change
	// on the input in such a way that it will properly bubble up to form-monitor.
	$('.datetimepicker').on('dp.change', function(e) {
		var event;

		if (e.date && e.oldDate && (e.oldDate !== e.date)) {
			event = $.Event('change');
			event.target = $('.form-control').get(0);

			$('form.when').trigger(event);
		}
	});

	// When the window is resized, recalculate the overflowing filters (i.e. fewer or more may fit without being
	// compacted.
	$(window).on('resize', debounce(function(e) {
		if ($('#search-bar').hasClass('expanded')) {
			return false;
		}

		compactOverflowFilters();
	}, RESIZE_DEBOUNCE));

	// Catch the query form submit and search button click events. Respond by triggering the "search" event on
	// the module itself. Any module that leverages this module must then execute code within the event
	// listeners and call the `resolve` function in order to re-enable search.
	(function(cb) {
		$('#query-form').on('submit', function(e) {
			e.preventDefault();

			return false;
		}).on('submit', function() {
			if (queryChanged === true) {
				$(exports).one('changed', function() {
					cb();
				});
			}
			else {
				cb();
			}
		});

		$('#search-button').on('click press', cb);
	})(throttle(function() {
		$(exports).triggerHandler('searching');

		return save()
			.then(function(saved) {
				updateActiveSearch(saved);

				return new Promise(function(resolve) {
					$(exports).triggerHandler('search', [resolve]);
				});
			})
			.catch(function(err) {
				$(exports).triggerHandler('error', err);
			});
	}));
});


exports = {
	Filter: Filter,

	check: exists,
	clear: clear,
	configure: configure,
	del: del,
	exists: exists,
	expand: expand,
	favorite: favorite,
	generateFilter: generateFilter,
	load: load,
	reset: reset,
	save: save,
	shrink: shrink,
	unfavorite: unfavorite
};

Object.defineProperties(exports, {
	current: {
		enumerable: true,
		get: function() {
			return currentSearch;
		},
		set: function(val) {
			currentSearch = val;
		}
	},

	dsl: {
		enumerable: true,
		get: assembleFilters
	},

	favorited: {
		enumerable: true,
		get: function() {
			return $('#search-favorited').hasClass('filled');
		},
		set: setFavorited
	},

	filters: {
		enumerable: true,
		get: getFilters
	},

	query: {
		enumerable: true,
		get: getQuery,
		set: setQuery
	}
});


module.exports = exports;
