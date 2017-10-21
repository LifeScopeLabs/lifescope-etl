const Promise = require('bluebird');
const $ = require('jquery');
const _ = require('lodash');
const externalActions = require('actions');
const cookies = require('cookies');
const debounce = require('debounce');
const embedContent = require('embed');
const favorite = require('favorite');
const history = require('history');
const humanize = require('humanize');
const icons = require('icons');
const leaflet = require('leaflet');
const menu = require('menu');
const moment = require('moment');
const nunjucks = require('nunjucks');
const objects = require('objects');
const search = require('search');
const throttle = require('throttle');
const viewstate = require('viewstate');
require('autoblur');
require('jquery-mixitup');
require('templates');
require('leaflet-awesome-markers');
require('minimodal');


var map;

// Valid View States: feed, grid, list, map, result
var container;
var spinner = viewstate.renderSync('explorer/components/waiting.html');
var paginationSpinner = viewstate.renderSync('explorer/components/next.html');
var errorBubble = viewstate.renderSync('explorer/components/error.html');
var sessionStorage = window.sessionStorage;
var location = window.location;

var SCROLL_DEBOUNCE = 500; // ms
var SCROLL_EMBED_LEAD_AREA = 700; // px
// Virtual scroll "cursor."
var cursor = {
	limit: 100,
	offset: 0
};

var previewContext = [
	{
		mapping: 'events',
		name: 'History',
		type: 'event'
	},

	{
		mapping: 'content',
		name: 'Content',
		type: 'content'
	},

	{
		mapping: 'contacts',
		name: 'Contacts',
		type: 'contact'
	},

	{
		mapping: 'things',
		name: 'Things',
		type: 'thing'
	},

	{
		mapping: 'places',
		name: 'Places',
		type: 'place'
	},

	{
		mapping: 'locations',
		name: 'Locations',
		type: 'location'
	},

	{
		mapping: 'organizations',
		name: 'Organizations',
		type: 'organization'
	}
];

var typeMappings = {};
var collectionMappings = {};
var nameMappings = {};

_.each(previewContext, function(item) {
	typeMappings[item.mapping] = item.type;
	nameMappings[item.mapping] = item.name;
	collectionMappings[item.type] = item.mapping;
});

// Valid View States: feed, grid, list, map, result
// Valid Results Shown: contacts, content, events, locations, people, places, things
var state = {
	view: null,
	mapping: null,
	object: null
};

var views = {
	grid: new viewstate.View('explorer/views/grid.html'),
	list: new viewstate.View('explorer/views/list.html'),
	feed: new viewstate.View('explorer/views/feed.html'),
	map: new viewstate.View('explorer/views/map.html')
};


var protocol = 'https';
var domain = 'app.lifescope.io';


// TODO: Remove this when API v2 is complete and we can query all object types separately.
function autofillPaginate() {
	var promise, minCount;

	// In feed view, you only need a dozen or so contacts to have enough to scroll on a 1080p display.
	// Contacts are the smallest feed item we have.
	// In grid view on desktop, you need more than 50 grid items to get that scrolling.
	// This is overkill for mobile devices, but this is a quick workaround to tide us over until API v2.
	minCount = state.view === 'feed' ? 12 : 55;

	if (objects.collections[state.mapping].length < minCount && objects.cursor.next) {
		promise = new Promise(function(resolve, reject) {
			objects.more()
				.then(function() {
					autofillPaginate().then(function() {
						return resolve();
					});
				});
		});
	}
	else {
		promise = Promise.resolve();
	}

	return promise;
}

function renderActionModal($object) {
	var object, type, typePlural, $action;

	$action = $('#action');


	type = $object.attr('class').replace('object ', '');
	typePlural = type === 'content' ? 'content' : type + 's';

	object = objects.cache[typePlural][$object.attr('id')];

	$action.modal({
		position: false,
		postOpen: function() {
			var content, scale, shareable, title, $body, $previewImg, $this = $(this);

			$body = $this.find('.body');

			if (type === 'contact') {
				shareable = true;
				title = object.handle;
			}
			else if (type === 'content') {
				shareable = true;

				if (object.title) {
					title = object.title;
				}
				else if (object.text) {
					title = object.text.slice(0, 100);
				}
				else {
					title = object.type;
				}
			}
			else if (type === 'event') {
				shareable = false;

				if (object.context) {
					title = object.context;
				}
				else {
					title = object.type;
				}
			}
			else if (type === 'thing') {
				shareable = true;

				if (object.title) {
					title = object.title;
				}
				else if (object.text) {
					title = object.text.slice(0, 100);
				}
				else {
					title = object.type;
				}
			}

			content = nunjucks.render('explorer/components/action/modal.html', {
				title: title,
				shareable: shareable,
				taggable: true,
				object: object
			});

			$body.empty().html(content);

			$('.share-action').append(externalActions.renderAction(object, 'share'));

			if (object.embed_thumbnail) {
				$body.find('.preview').empty().html('<img src="' + object.embed_thumbnail + '"></img>');
				$previewImg = $('.preview img');

				if ($previewImg.width() > $('.preview').width()) {
					scale = $('.preview').width() / $previewImg.width();

					$previewImg.css('width', $previewImg.width() * scale);
					$previewImg.css('height', $previewImg.height() * scale);
				}
			}

			$this.css('display', 'flex');
		}
	});
}

function renderFeedEmbeddables($target) {
	var docViewBottom, docViewTop, elemBottom, elemTop, height, object, width, $contentEmbedContainers, $embedContainer, $parentContainer;

	$contentEmbedContainers = $target.find('.content-embed');
	docViewTop = $target.scrollTop();
	docViewBottom = docViewTop + $target.height();

	_.forEach($contentEmbedContainers, function(embedContainer) {
		$embedContainer = $(embedContainer);

		elemTop = $embedContainer.offset().top;
		elemBottom = elemTop + $embedContainer.height();

		$parentContainer = $(embedContainer.parentElement);

		if ((elemBottom <= docViewBottom + SCROLL_EMBED_LEAD_AREA) && (elemTop >= docViewTop - SCROLL_EMBED_LEAD_AREA)) {
			if ($embedContainer.children().length === 0) {
				$embedContainer.css('height', null);
				object = $parentContainer.data('object');

				embedContent(object, $embedContainer);
			}
		}
		else {
			width = $embedContainer.width();
			height = $embedContainer.height();

			if (height > 0) {
				$embedContainer.height(height);
			}

			$embedContainer.empty();
		}
	});
}

/**
 * Renders the page for a newly-selected view state.
 *
 * @returns {Promise} A promise that is resolved when the selected view is rendered.
 */
function renderState() {
	var html, humanized, promise, type, view, $count, $control, $list;

	if (!views.hasOwnProperty(state.view)) {
		return Promise.reject(new Error('Invalid view type.'));
	}

	promise = Promise.resolve();
	type = typeMappings[state.mapping];
	$list = $('#list');

	// MixItUp can run into problems if there are multiple copies active at once, so destroy any active copies.
	if ($list.mixItUp && $list.mixItUp('isLoaded')) {
		$list.mixItUp('destroy', true);
	}

	$count = $('.count').empty();

	if (objects.cursor.count > 0) {
		$('.controls').removeClass('hidden');

		if (state.mapping === 'events') {
			humanized = humanize.compactInteger(objects.cursor.count);
			$count.text(humanized);
		}

		resetView();

		// TODO: Remove autofillPaginate when API v2 is complete and we can query all object types separately.
		autofillPaginate().then(function() {
			if (state.view === 'map') {
				//$body = $('body');
				//mapView.render().done(function() {
				//	var $expandDetails;
				//
				//	$body.addClass('map');
				//	container.insert(mapView);
				//	$('#background').append(map.element);
				//	$list = $('#list');
				//	addResults(objects.collections[state.mapping]);
				//
				//	//TODO: Figure out how to bind scroll event delegation instead of binding directly to #background
				//	$list.on('scroll', throttle(checkScroll, SCROLL_DEBOUNCE));
				//	renderFeedEmbeddables($list);
				//
				//	//Prep the expandDetails element for showing the #left panel.
				//	$expandDetails = $('#expand-details');
				//	$expandDetails.removeClass('hidden');
				//	$expandDetails.children('i').removeClass('fa-caret-right').addClass('fa-caret-left');
				//	$('#details-scroll').addClass('hidden');
				//
				//	addMapMarkers();
				//
				//	//If not in mobile, put the controls back in.
				//	if (!isMobile) {
				//		addMapControls();
				//	}
				//
				//	//Resize the map and fit it so that all markers are visible.
				//	map.resize();
				//
				//	if (map.markers.getBounds()._southWest != null) {
				//		map.object.fitBounds(map.markers.getBounds());
				//	}
				//
				//	//Show the #left panel and perform the initial sort.
				//	$('#left').addClass('expanded');
				//});
			}
			else {
				view = views[state.view];

				promise = promise
					.then(function() {
						return view.render();
					})
					.then(function() {
						return objects.render(state.view, objects.collections[state.mapping].slice(0, cursor.limit));
					})
					.tap(function(fragments) {
						var $list;

						resetView();
						container.insert(view);

						$list = $('#list');
						cursor.offset = fragments.length;

						$list.append(fragments);
					});
			}

			if (state.view === 'feed') {
				promise = promise.then(function() {
					$list = $('#list');

					$list.closest('main').on('scroll', debounce(function() {
						renderFeedEmbeddables($list.parent());
					}, SCROLL_DEBOUNCE));

					//render Embeddables the first time
					renderFeedEmbeddables($list.parent());

					return Promise.resolve();
				});
			}

			promise.then(function(result) {
				var sortContext, typesContext, $selectedSort, $sortFields, $sortArrow;

				if (type) {
					sortContext = objects[type[0].toUpperCase() + type.slice(1)].sort;
				}
				else {
					sortContext = objects.Event.sort;
				}

				$sortFields = $('.sort .fields');

				$('.facets .current .name').text(nameMappings[state.mapping]);
				$('.views .current .name').text(state.view);

				//Generate the sort selectors for the current object type.
				html = nunjucks.render('explorer/components/sort.html', sortContext);
				$sortFields.html(html);

				typesContext = {
					types: _.filter(previewContext, function(type) {
						return objects.collections[type.mapping].length > 0;
					})
				};

				html = nunjucks.render('explorer/components/facets.html', typesContext);
				$('.facets .drawer').html(html);

				$control = $('#menu .views a[data-view="' + state.view + '"], .controls .views a[data-view="' + state.view + '"]');

				$control.siblings().removeClass('active');
				$control.addClass('active');

				$control = $('#menu .facets a[data-type="' + state.mapping + '"], .controls .facets a[data-type="' + state.mapping + '"]');

				$control.siblings().removeClass('active');
				$control.addClass('active');

				// Update the sort DOM elements.
				$selectedSort = $sortFields.find('[data-sort="' + objects.cursor.sort.field + '"]');

				$('.sort .current .name').text($selectedSort.data('name'));

				$sortArrow = $selectedSort.find('.fa');

				_.forEach($sortFields.children('div'), function(sortItem) {
					var $sortItem = $(sortItem);

					$sortItem.removeClass('active');
					$sortItem.find('.sort-arrow').removeClass('fa-chevron-up').removeClass('fa-chevron-down');
				});

				$selectedSort.addClass('active');

				if (objects.cursor.sort.order === 'asc') {
					$sortArrow.addClass('fa-chevron-up');
				}
				else {
					$sortArrow.addClass('fa-chevron-down');
				}

				return Promise.resolve(result);
			});

			return promise.then(function() {
				var scroller, $main;

				$main = $('#list').closest('main');

				scroller = throttle(function(e) {
					var page, promise, scrollBottom, slice, $list;

					scrollBottom = e.target.scrollTop + $(e.target).outerHeight();

					if (scrollBottom > 0.90 * e.target.scrollHeight) {
						$list = $('#list');

						if (objects.cursor.next || cursor.offset < objects.collections[state.mapping].length) {
							$list.addClass('loading');
							$list.append(paginationSpinner);

							if (cursor.offset < objects.collections[state.mapping].length) {
								page = {};
								slice = objects.collections[state.mapping].slice(cursor.offset, cursor.offset + cursor.limit);
								page[state.mapping] = slice;

								cursor.offset += cursor.limit;

								promise = Promise.resolve(page);
							}
							else {
								promise = objects.more()
									.tap(function() {
										cursor.offset = objects.collections[state.mapping].length;
									});
							}

							return promise
								.then(function(data) {
									if (data == null) {
										$main.off('scroll.more', scroller);

										return Promise.resolve();
									}

									$list.removeClass('loading');
									$('#next-icon').remove();

									return objects.render(state.view, data[state.mapping]);
								})
								.tap(function(fragments) {
									$list.append(fragments);
								})
								.catch(function(err) {
									// TODO: Show an error message somehow? Notifications?

									$list.removeClass('loading');
									$('#next-icon').remove();
								});
						}
						else {
							$main.off('scroll.more', scroller);
						}
					}
				});

				$main.off('scroll.more').on('scroll.more', scroller);

				return Promise.resolve(view);
			});
		});
	}
	else {
		return promise.then(function() {
			container.clear();
			container.insert(nunjucks.render('explorer/components/no-results.html'));
			$('.controls').addClass('hidden');

			return Promise.resolve();
		});
	}
}

/**
 * Resets the viewport so that a different view/facet can be rendered cleanly.
 */
function resetView() {
	container.clear();
	search.shrink();
	menu.close();
	$('body')
		.removeClass('feed grid list map results')
		.addClass(state.view);
}

function resizeNextPrev() {
	var left, width, $content, $next, $prev;

	$content = $('#details').find('.content');

	$next = $content.find('.next');
	$prev = $content.find('.prev');

	left = $content.offset().left;
	width = $content.outerWidth();

	if ($('.item.active').prev().length === 0) {
		$prev.addClass('hidden');
	}
	else {
		$prev.removeClass('hidden');
		$prev.css('left', left - $prev.outerWidth() + 1);
	}

	if ($('.item.active').next().length === 0) {
		$next.addClass('hidden');
	}
	else {
		$next.removeClass('hidden');
		$next.css('left', left + width - 1);
	}
}

/**
 * Highlights an object that has been selected, usually by rendering its details.
 * @param {object} object The object that has being selected.
 */
function selectObject(object) {
	var $details;

	state.object = object;

	if (state.view != 'feed') {
		object._viewFragments[state.view].scrollIntoView(true);

		$details = $('#details');
		$details.find('.body').empty();
		$details.modal({
			position: false,
			postOpen: function() {
				var $this = $(this);

				objects.render('details', state.object)
					.then(function(fragment) {
						var $body, $contentEmbedContainers;

						$body = $this.find('.body');
						$body.empty().html(fragment);

						$contentEmbedContainers = $body.find('.content-embed');

						_.forEach($contentEmbedContainers, function(embedContainer) {
							var embedObject, $parentContainer;

							$parentContainer = $(embedContainer).parent('.object');
							embedObject = $parentContainer.data('object');

							embedContent(embedObject, $(embedContainer));
						});

						$this.css('display', 'flex');

						resizeNextPrev();
					});
			},
			postClose: function() {
				$('.item').removeClass('active');
			}
		});
	}
}

/**
 * Adds markers to the map. If passed an object, then it just adds a marker for that object. If no object is passed,
 * then it adds markers for every one of the current object type being displayed.
 *
 * @param {object} [object] If present, then only this object's location will be added to the map
 */
//function addMapMarkers(object) {
//	var coordinates, estimated, icon, results;
//
//	//If no object is passed in, then the list of objects to be mapped ('feed') should be all of the ones
//	//of the current object type shown.
//	if (object === null) {
//		//Since results are stored in a dictionary, convert the dictionary of the current object type shown
//		//into an array.
//		results = [];
//
//		_.forEach(Object.keys(searchResults[state.type]), function(val) {
//			if (searchResults[explorerState.objectTypeShown][val].location) {
//				results.push(searchResults[explorerState.objectTypeShown][val]);
//			}
//		});
//	}
//	//If an object is passed in, then the list of objects to be mapped ('feed') should be just the object.
//	else {
//		results = [object];
//	}
//
//	//Clear all of the current markers on the map.
//	map.clearData();
//
//	//If currently showing events or places:
//	if (explorerState.objectTypeShown === 'events' || explorerState.objectTypeShown === 'places') {
//		//Add markers to the map using the given callback function on each result item.
//		map.addData(results, function(data) {
//			var icon;
//
//			//Add the event type's icon to the marker if it's an event.
//			if (explorerState.objectTypeShown === 'events') {
//				icon = icons.getEventFontIcon(data);
//			}
//			//Add the place type's icon to the marker if it's a place.
//			//TODO: Pick icons for different place types.
//			else if (explorerState.objectTypeShown === 'places') {
//				icon = icons.getPlaceFontIcon();
//			}
//
//			//Get the coordinates and whether or not this location is estimated.
//			coordinates = data.location.geolocation;
//			estimated = data.location.estimated;
//
//			//Create the icon, with a different color depending on whether the location is estimated.
//			icon = leaflet.AwesomeMarkers.icon({
//				icon: icon,
//				prefix: 'fa',
//				markerColor: estimated ? 'green' : 'blue'
//			});
//
//			//Return a new leaflet marker with some additional information saved on the options dictionary.
//			return leaflet.marker([coordinates[1], coordinates[0]], {
//				estimated: estimated,
//				objectId: data.id,
//				icon: icon
//			});
//		});
//	}
//	//If currently showing locations:
//	else if (explorerState.objectTypeShown === 'locations') {
//		//Add markers to the map using the given callback function on each result item.
//		map.addData(results, function(data) {
//			//Get the coordinates.
//			coordinates = data.geolocation;
//
//			//Create the icon.
//			icon = leaflet.AwesomeMarkers.icon({
//				icon: icons.getLocationFontIcon(),
//				prefix: 'fa',
//				markerColor: 'blue'
//			});
//
//			//Return a new leaflet marker with some additional information saved on the options dictionary.
//			return leaflet.marker([coordinates[1], coordinates[0]], {
//				objectId: data.id,
//				icon: icon
//			});
//		});
//	}
//}

/**
 * Sets the colors of all the markers on the map.
 * Every marker is set to either green (if the coordinates are estimated) or blue (if not).
 * If an objectId is passed in, then the marker associated with that objectId will be highlighted orange.
 * @param {string} [objectIdToHighlight] The objectId of an object whose marker should be highlighted.
 */
function setMarkerColors(objectIdToHighlight) {
	//Iterate over each marker.
	map.eachMarker(function(marker) {
		var icon;

		//Get the icon for the marker and un-highlight it by remove the orange class.
		icon = $(marker._icon);
		icon.removeClass('awesome-marker-icon-orange');

		//If the coordinates were estimated, then make the marker green.
		if (marker.options.estimated) {
			icon.addClass('awesome-marker-icon-green');
		}
		//If the coordinates were not estimated, then make the marker blue.
		else {
			icon.addClass('awesome-marker-icon-blue');
		}

		//If the marker's saved objectId matches the input objectId, then center the map on that marker and make the marker orange.
		//If no objectId was passed in, then this will never match.
		if (marker.options.objectId === objectIdToHighlight) {
			map.setCenter(marker._latlng);

			$(marker._icon).removeClass('awesome-marker-icon-blue').removeClass('awesome-marker-icon-green').addClass('awesome-marker-icon-orange');
		}
	});
}

// Bind Map view-specific events.
views.map.on('map:zoom', function() {
	// When the user zooms the map, de-select any active objects.
	var $active;

	$active = $('.item.active');
});

$(search).on('searching', function(e) {
	state.view = 'feed';

	container.clear();
	container.insert(spinner);

	history.replace.delParam(['view', 'type']);
});

$(search).on('search', function(e, done) {
	objects.search({
			query: search.query.replace(/#[A-Za-z0-9-]+\s?/g, ''),
			dsl: search.dsl
		})
		.then(renderState)
		.then(done)
		.catch(function(err) {
			container.clear();
			container.insert(errorBubble);
			done();
		});
});

$(search).on('update', function(e, search) {
	if (search && search.id) {
		history.replace.param('qid', search.id);
	}
	else {
		history.replace.delParam('qid');
	}
});

$(search).on('error', function(err) {
	container.clear();
	container.insert(errorBubble);
});

$(document).ready(function() {
	(function() {
		var params, qid;

		container = new viewstate.Component('main');
		container.clear();
		container.insert(spinner);

		params = $.deparam(location.search.slice(1));
		state.view = params.view || sessionStorage.getItem('view') || 'feed';
		state.mapping = params.type || sessionStorage.getItem('type') || 'events';
		qid = params.qid || sessionStorage.getItem('qid');

		sessionStorage.removeItem('qid');
		sessionStorage.removeItem('view');
		sessionStorage.removeItem('type');

		return search.load(qid).then(function(saved) {
			return search.save()
				.then(function() {
					return Promise.resolve(saved);
				});
		});
	})()
		.then(function(saved) {
			if (saved && saved.id) {
				history.replace.param('qid', saved.id);
			}
			else {
				history.replace.delParam('qid');
			}

			return objects.search({
				query: search.query.replace(/#[A-Za-z0-9-]+/g, ''),
				dsl: search.dsl
			});
		})
		.then(renderState)
		.catch(function(err) {
			container.clear();
			container.insert(errorBubble);
		});

	//When explorer is loaded, get the Mapbox token.
	//$.ajax({
	//	url: '/tokens/mapbox',
	//	type: 'GET',
	//	dataType: 'json'
	//}).done(function(data) {
	//	// When the Mapbox token has been retrieved, create a new Cartano map with it.
	//
	//	map = new cartano.Map(data.MAPBOX_USER_NAME, {
	//		accessToken: data.MAPBOX_ACCESS_TOKEN,
	//
	//		className: 'flex-grow',
	//
	//		zoomControl: true,
	//		drawControl: true,
	//		layerControl: true
	//	});
	//
	//	//Bind event listeners to the map.
	//	map.object.on('click', function() {
	//		//Deselect all events when you click on the map in map view (if you clicked on a marker, that will fire after this occurs).
	//		if (explorerState.currentViewState === 'map') {
	//			setMarkerColors();
	//			$('#details').empty();
	//			$('#details-scroll').addClass('hidden');
	//			$('.list-item').removeClass('active');
	//		}
	//	}).on('overlayremove', function() {
	//		//If overlays are removed from the map, then trigger a click so that anything currently selected is deselected.
	//		$(map.object._container).trigger({
	//			type: 'click'
	//		});
	//	});
	//});

	// Select the current item when
	$(document).on('click', '.item', function() {
		var object, $this = $(this);

		$this.addClass('active');
		object = $this.data('object');

		selectObject(object);
	});

	// When the user clicks on a sort selector, sort on that field.
	$(document).on('click', '.sort .fields > a', throttle(function(e) {
		var sortField, $this = $(this);

		e.preventDefault();

		sortField = $this.attr('data-sort');

		// If the new sort type is the same as the previous sort type, then swap to the opposite asc/desc of what
		// was in use before.
		if (objects.cursor.sort.field === sortField) {
			objects.cursor.sort.order = objects.cursor.sort.order === 'asc' ? 'desc' : 'asc';
		}
		// If the new sort type is different from the previous sort type:
		else {
			// Usually, we want the first sort of a field to be asc, so that things are in alphabetical order
			// starting with 'A'. With datetimes, though, we're assuming the user wants the most recent objects
			// first, which is desc order.
			objects.cursor.sort.field = sortField;
			objects.cursor.sort.order = (objects.cursor.sort.field === 'datetime' || objects.cursor.sort.field === '_score') ? 'desc' : 'asc';
		}

		container.clear();
		container.insert(spinner);

		objects.search({
			query: search.query.replace(/#[A-Za-z0-9]+/g, ''),
			dsl: search.dsl,
			sortField: objects.cursor.sort.field,
			sortOrder: objects.cursor.sort.order
		})
			.then(renderState);
	}));

	// When the user clicks on a marker or markercluster:
	//$(document).on('marker:click', function(e) {
	//	var marker;
	//
	//	marker = e.marker;
	//
	//	//If the user clicked on a cluster, then wait until it finishes zooming to fit the clustered markers.
	//	if (e.clustered) {
	//		map.object.on('zoomend', function() {
	//			//If the map is at the maximum zoom level, then what we clicked on couldn't be de-clustered and should be spiderfied.
	//			//TODO: Get this spiderfication to actually work.
	//			if (map.object.getZoom() === 18) {
	//				marker.spiderfy();
	//			}
	//		});
	//	}
	//});

	$(document).on('click', '#menu a.explorer', function(e) {
		if (/^\/explore/.test(location.pathname)) {
			e.preventDefault();
		}
	});

	$(document).on('click', '#menu .views a:not(.active), .controls .views a:not(.active)', throttle(function(e) {
		var view, $this = $(this);

		e.preventDefault();

		state.view = view = $this.data('view');

		$this.find('.container').addClass('hidden');

		sessionStorage.setItem('explorer.view', view);
		history.replace.param('view', view);

		return renderState();
	}));

	$(document).on('click', '#menu .facets a:not(.active), .controls .facets a:not(.active)', throttle(function(e) {
		var type, $this = $(this);

		e.preventDefault();

		state.mapping = type = $this.data('type');

		$this.find('.container').addClass('hidden');

		sessionStorage.setItem('explorer.type', type);
		history.replace.param('type', type);

		return renderState();
	}));

	$(document).on('click', '.controls .facets .current, .controls .views .current', function() {
		var $caret, $this = $(this);

		$this.siblings().toggleClass('hidden');

		$caret = $this.find('i.fa-caret-down');

		if ($caret.length > 0) {
			$caret.removeClass('fa-caret-down').addClass('fa-caret-up');
		}
		else {
			$this.find('i.fa-caret-up').removeClass('fa-caret-up').addClass('fa-caret-down');
		}
	});

	$(document).on('click', '.action-bar, .object.contact > div:first-child', function() {
		var $this = $(this);

		renderActionModal($($this.closest('.object')));
	});

	$(document).on('click', '.action-bar .close', function(e) {
		var $actionBar, $this = $(this);
		$actionBar = $this.parents('.action-bar');

		$actionBar.find('.share-menu').hide();
		$actionBar.find('.share-action').show();
	});

	$(document).on('click', '#search-favorited', function(e) {
		var favorited, html, icon, iconColor, name, $colorPreview, $favorite, $iconPreview, $name;

		$favorite = $('#favorite');

		if (search.current == null) {
			favorited = false;
			icon = null;
			iconColor = null;
			name = '';
		}
		else {
			favorited = search.current.favorited;
			icon = search.current.icon;
			name = search.current.name;
			iconColor = search.current.icon_color;
		}

		html = nunjucks.render('components/favorite.html', {
			hideDelete: search.current == null,
			hideUnfavorite: !favorited
		});

		$favorite.find('.body').html(html);

		$name = $favorite.find('input[name="search-name"]');
		$name.val(name);

		if (icon == null || icon.length === 0) {
			icon = 'none';
		}

		if (iconColor == null || iconColor.length === 0) {
			iconColor = '#b6bbbf';
		}

		$colorPreview = $favorite.find('.color-picker .preview');
		$iconPreview = $favorite.find('.icon-picker .preview');

		$colorPreview.find('input').val(iconColor);
		$colorPreview.find('label').css('background-color', iconColor);

		$iconPreview.addClass(icon);

		$favorite.find('.data > i').addClass(icon).css('color', iconColor);

		$favorite.modal({
			position: false,
			postOpen: function() {
				$(this).css('display', 'flex');
			}
		});
	});

	$(document).on('click', '#favorite button', function(e) {
		var action, icon, id, paramData, promise, $favorite, $icon, $target;

		$target = $(e.target);

		action = $target.closest('[data-action]').data('action');
		id = search.current ? search.current.id : null;

		promise = new Promise(function(resolve) {
			if (action === 'unfavorite') {
				search.unfavorite(id).then(function() {
					$('#search-favorited').removeClass('filled');

					search.current.favorited = false;

					resolve(null);
				});
			}
			else if (action === 'save') {
				$favorite = $('#favorite');
				$icon = $favorite.find('.data > i');

				paramData = {
					id: id,
					favorited: true,
					icon_color: $('#color-edit').val(),
					name: $favorite.find('input[name="search-name"]').val()
				};

				icon = $icon.attr('class');

				if (!icon || $icon.hasClass('transparent')) {
					paramData.icon = 'none';
				}
				else {
					paramData.icon = icon;
				}

				search.favorite(paramData).then(function() {
					$('#search-favorited').addClass('filled');

					search.current.favorited = paramData.favorited;
					search.current.icon_color = paramData.icon_color;
					search.current.name = paramData.name;

					if (paramData.icon) {
						search.current.icon = paramData.icon;
					}

					resolve(null);
				});
			}
			else if (action === 'delete') {
				search.del(id).then(function() {
					$('#search-favorited').removeClass('filled');

					search.current = null;

					history.replace.delParam('qid');

					resolve(null);
				});
			}
			else {
				resolve(null);
			}
		});

		promise.then(function() {
			$.modal.close();
		});
	});

	$(document).on('click', '.object .text .expand', function() {
		var $this = $(this);

		$this.hide();
		$this.siblings('.truncated').hide();
		$this.siblings('.full').show();
	});

	$(document).on('click', '.object .interactions .expand', function() {
		var $this = $(this);

		$this.hide();
		$this.siblings('.objects').children().show();
	});

	$(document).on('click', '#details .content > aside', function() {
		var $currentObject, $newObject, $this = $(this);

		$currentObject = $('.item.active');

		if ($this.hasClass('next')) {
			$newObject = $currentObject.next();
		}
		else {
			$newObject = $currentObject.prev();
		}

		$.modal.close();

		if ($newObject.length > 0) {
			$newObject.trigger('click');
		}
	});

	$(document).on('swipeleft', '#details .content', function(e) {
		var $currentObject, $newObject;

		$currentObject = $('.item.active');

		$newObject = $currentObject.next();

		$.modal.close();

		if ($newObject.length > 0) {
			$newObject.trigger('click');
		}
	});

	$(document).on('swiperight', '#details .body', function(e) {
		var $currentObject, $newObject;

		$currentObject = $('.item.active');

		$newObject = $currentObject.prev();

		$.modal.close();

		if ($newObject.length > 0) {
			$newObject.trigger('click');
		}
	});

	$(document).on('submit', '.tagging form', function(e) {
		e.preventDefault();
		e.stopPropagation();

		return false;
	});

	$(document).on('submit', '.tagging form', function() {
		var id, input, slugifiedTag, tag, tags, tagMasks, type, $items, $modal, $this = $(this);

		input = $this.find('input');
		tag = input.val().replace(/[^a-zA-Z0-9\s-]/, '').replace(/\s+/g, ' ');
		slugifiedTag = tag.toLowerCase().replace(/\s/g, '-');
		id = $this.closest('.actions').attr('data-id');

		$modal = $('.modal .actions');
		$items = $('.object[id="' + id + '"]');
		type = $items.attr('class').replace('object ', '');

		if (tag.length > 0) {
			$.ajax({
				url: protocol + '://' + domain + '/api/' + collectionMappings[type] + '/' + id + '/tag',
				type: 'POST',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify({
					tags: [slugifiedTag]
				}),
				headers: {
					'X-CSRF-Token': window.csrftoken
				}
			})
				.then(function() {
					var dataObj, event, events, h, i, index, item, newTag, tagMask, $item;

					newTag = false;

					if (type === 'event') {
						events = [objects.cache.events[id]];
					}
					else {
						events = _.filter(objects.cache.events, function(event) {
							return _.find(event[collectionMappings[type]], function(item) {
								return item.id === id;
							});
						});
					}

					for (h = 0; h < events.length; h++) {
						event = events[h];

						if (type === 'event') {
							tagMasks = objects.cache.events[id].tagMasks;
						}
						else {
							for (i = 0; i < objects.cache.events[event.id][collectionMappings[type]].length; i++) {
								if (objects.cache.events[event.id][collectionMappings[type]][i].id === id) {
									index = i;
									tagMasks = objects.cache.events[event.id][collectionMappings[type]][i].tagMasks;
								}
							}
						}

						if (tagMasks == null || tagMasks.added == null || $.inArray(tag, tagMasks) === -1) {
							newTag = true;

							if (tagMasks == null) {
								tagMasks = {
									added: [],
									removed: [],
									source: []
								};
							}

							if (tagMasks.added == null) {
								tagMasks.added = [];
							}

							if (tagMasks.removed == null) {
								tagMasks.removed = [];
							}

							if (tagMasks.source == null) {
								tagMasks.source = [];
							}

							if ($.inArray(tag, tagMasks.added) === -1) {
								tagMasks.added.push(tag);
							}

							if ($.inArray(tag, tagMasks.removed) > -1) {
								tagMasks.removed.splice($.inArray(tag, tagMasks.removed), 1);
							}

							tags = _.cloneDeep(tagMasks.source);

							for (i = 0; i < tagMasks.added.length; i++) {
								tagMask = tagMasks.added[i];

								if ($.inArray(tagMask, tags) === -1) {
									tags.push(tagMask);
								}
							}

							for (i = 0; i < tagMasks.removed.length; i++) {
								tagMask = tagMasks.removed[i];

								if ($.inArray(tagMask, tags) > -1) {
									tags.splice($.inArray(tagMask, tags), 1);
								}
							}

							if (type !== 'event') {
								event[collectionMappings[type]][index].tagMasks = tagMasks;

								item = objects.cache.events[event.id];
								item._renderCache = {};

								if (state.view === 'grid' || state.view === 'list') {
									$item = $('.item[data-id="' + item.id + '"]');
									dataObj = $item.data('object');

									dataObj._renderCache = {};
									dataObj.sumTags = tags;
									delete dataObj._viewFragments.details;

									$item.data('object', dataObj);
								}
							}
							else {
								event.tagMasks = tagMasks;
								event.sumTags = event.uniqueTags;

								item = objects.cache.events[event.id];
								item._renderCache = {};

								if (state.view === 'grid' || state.view === 'list') {
									$item = $('.item[data-id="' + item.id + '"]');
									dataObj = $item.data('object');

									dataObj._renderCache = {};
									dataObj.sumTags = event.sumTags;
									delete dataObj._viewFragments.details;

									$item.data('object', dataObj);
								}
							}

							objects.cache[collectionMappings[type]][id]._renderCache = {};

							return Promise.resolve(newTag);
						}
						else {
							return Promise.resolve(null);
						}
					}
				})
				.then(function(newTag) {
					var i, regExp, tagMatch, $item, $currentTags;

					if (type !== 'event' && state.mapping === 'events') {
						$items = $items.closest('.event').find('aside.details');
					}

					if (type === 'event') {
						$items = $items.find('aside.details');
					}

					objects.cache[collectionMappings[type]][id].tags = tags;
					objects.cache[collectionMappings[type]][id].tagMasks = tagMasks;

					if (newTag) {
						regExp = new RegExp('^#' + tag + '$', 'g');

						$modal.find('.tagging .tags').append('<div><span>#' + tag + '</span><i class="delete fa fa-times"></i></div>');
						$currentTags = $items.find('.tagging .tags');

						for (i = 0; i < $currentTags.length; i++) {
							$item = $($currentTags.get(i));

							tagMatch = _.find($item.find('span'), function(span) {
								return $(span).html().match(regExp) != null;
							});

							if (!tagMatch) {
								$item.append('<span>#' + tag + '</span>');
							}
						}
					}
				});
		}

		$modal.find('.tagging .add-tag input[type="text"]').val('');
	});

	$(document).on('click', '.tagging .delete', function() {
		var id, slugifiedTag, tag, tags, tagMasks, type, $items, $modal, $this = $(this);

		tag = $this.siblings('span').html().slice(1);
		slugifiedTag = tag.toLowerCase().replace(/\s/g, '-');
		id = $this.closest('.actions').attr('data-id');

		$modal = $('.modal .actions');
		$items = $('.object[id="' + id + '"]');
		type = $items.attr('class').replace('object ', '');

		$.ajax({
			url: protocol + '://' + domain + '/api/' + collectionMappings[type] + '/' + id + '/tag',
			type: 'DELETE',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify({
				tags: [slugifiedTag]
			}),
			headers: {
				'X-CSRF-Token': window.csrftoken
			}
		})
			.then(function() {
				var dataObj, event, events, h, i, index, item, tagMask, $item;

				if (type === 'event') {
					events = [objects.cache.events[id]];
				}
				else {
					events = _.filter(objects.cache.events, function(event) {
						return _.find(event[collectionMappings[type]], function(item) {
							return item.id === id;
						});
					});
				}

				for (h = 0; h < events.length; h++) {
					event = events[h];

					if (type === 'event') {
						tagMasks = objects.cache.events[id].tagMasks;
					}
					else {
						for (i = 0; i < objects.cache.events[event.id][collectionMappings[type]].length; i++) {
							if (objects.cache.events[event.id][collectionMappings[type]][i].id === id) {
								index = i;
								tagMasks = objects.cache.events[event.id][collectionMappings[type]][i].tagMasks;
							}
						}
					}

					if (tagMasks == null) {
						tagMasks = {
							added: [],
							removed: [],
							source: []
						};
					}

					if (tagMasks.added == null) {
						tagMasks.added = [];
					}

					if (tagMasks.removed == null) {
						tagMasks.removed = [];
					}

					if (tagMasks.source == null) {
						tagMasks.source = [];
					}

					if ($.inArray(tag, tagMasks.added) > -1) {
						tagMasks.added.splice($.inArray(tag, tagMasks.added), 1);
					}

					if ($.inArray(tag, tagMasks.removed) === -1) {
						tagMasks.removed.push(tag);
					}

					tags = _.cloneDeep(tagMasks.source);

					for (i = 0; i < tagMasks.added.length; i++) {
						tagMask = tagMasks.added[i];

						if ($.inArray(tagMask, tags) === -1) {
							tags.push(tagMask);
						}
					}

					for (i = 0; i < tagMasks.removed.length; i++) {
						tagMask = tagMasks.removed[i];

						if ($.inArray(tagMask, tags) > -1) {
							tags.splice($.inArray(tagMask, tags), 1);
						}
					}

					if (type !== 'event') {
						event[collectionMappings[type]][index].tagMasks = tagMasks;

						item = objects.cache.events[event.id];
						item._renderCache = {};

						if (state.view === 'grid' || state.view === 'list') {
							$item = $('.item[data-id="' + item.id + '"]');
							dataObj = $item.data('object');

							dataObj._renderCache = {};
							dataObj.sumTags = tags;
							delete dataObj._viewFragments.details;

							$item.data('object', dataObj);
						}
					}
					else {
						event.tagMasks = tagMasks;
						event.sumTags = event.uniqueTags;

						item = objects.cache.events[event.id];
						item._renderCache = {};

						if (state.view === 'grid' || state.view === 'list') {
							$item = $('.item[data-id="' + item.id + '"]');
							dataObj = $item.data('object');

							dataObj._renderCache = {};
							dataObj.sumTags = event.sumTags;
							delete dataObj._viewFragments.details;

							$item.data('object', dataObj);
						}
					}

					objects.cache[collectionMappings[type]][id]._renderCache = {};
				}

				objects.cache[collectionMappings[type]][id].tagMasks = tagMasks;

				return Promise.resolve(null);
			})
			.then(function() {
				var allTags, i, regExp, $event, $events, $itemSpans, $modalSpans;

				regExp = new RegExp('^#' + tag + '$', 'g');

				if (type !== 'event' && state.mapping === 'events') {
					$items = $events = $items.closest('.event');
					$items = $items.find('aside.details');
				}

				if (type === 'event') {
					$events = $items.closest('.event');
					$items = $items.find('aside.details');
				}

				$modalSpans = $modal.find('.tagging .tags span');
				$itemSpans = $items.find('.tagging .tags span');

				$(_.find($modalSpans, function(span) {
					return $(span).html().match(regExp) != null;
				})).closest('div').remove();

				if (state.mapping === 'events') {
					for (i = 0; i < $events.length; i++) {
						$event = $($events.get(i));
						allTags = objects.cache.events[$event.attr('id')].allTags;

						if (allTags.indexOf(tag) === -1) {
							$(_.find($event.find('.tagging .tags span'), function(span) {
								return $(span).html().match(regExp) != null;
							})).remove();
						}
					}
				}
				else {
					$(_.find($itemSpans, function(span) {
						return $(span).html().match(regExp) != null;
					})).remove();
				}

				return Promise.resolve(null);
			});
	});

	$(window).on('resize', function(e) {
		if ($('#details').css('display') === 'none' || $('#details').css('display') == null) {
			return false;
		}

		resizeNextPrev();
	});

	$(window).on('message', function(e) {
		var type;

		type = JSON.parse(e.originalEvent.data).type;

		if (type === 'resize.embed') {
			resizeNextPrev();
		}
	});
});
