const $ = require('jquery');
const _ = require('lodash');
const moment = require('moment');
const nunjucks = require('nunjucks');
require('templates');


/**
 *
 * Google social interactions
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/social-interactions
 *
 * @type {{defaults: {url: string, title: string, description: string, imageURL: string, hashtags: string, via: string}, urls: {share: {facebook: {href: string, app_id: string, caption: string, after: URL_TEMPLATES.urls.share.facebook.after}, twitter: {href: string, after: URL_TEMPLATES.urls.share.twitter.after}, googlePlus: {href: string, after: URL_TEMPLATES.urls.share.googlePlus.after}, tumblr: {href: string, after: URL_TEMPLATES.urls.share.tumblr.after}, pinterest: {href: string, after: URL_TEMPLATES.urls.share.pinterest.after}, reddit: {href: string, href_text: string, after: URL_TEMPLATES.urls.share.reddit.after}, linkedin: {href: string, after: URL_TEMPLATES.urls.share.linkedin.after}, email: {href: string, after: URL_TEMPLATES.urls.share.email.after}, sms: {href: string, after: URL_TEMPLATES.urls.share.sms.after}}, actions: {wolfram_calc: {href: string}, cisi: {href: string}, amazon: {href: string}, wikipedia: {href: string}}, location: {googleMaps_show: {href: string}, googleMaps_nav: {href: string}, wolfram: {href: string}, weather: {href: string}}}}}
 */
var URL_TEMPLATES = {
	defaults: {
		url: 'https://live.bitscoop.com',  // the url you'd like to share.
		title: 'Shared via BitScoop',  // title to be shared alongside your link
		description: 'Search & Explore the Internet of You',  // text to be shared alongside your link
		imageURL: 'https://s3.amazonaws.com/bitscoop-live/images/logo/logo.png',  // image to be shared
		hashtags: 'BitScoop'
		//via: 'BitScoopLabs'
	},
	urls: {
		share: {
			facebook: {
				href: 'http://www.facebook.com/sharer.php?s=100&p[title]={{ title }}&p[summary]={{ description }}&p[url]={{ url }}&p[images][0]={{ imageURL }}',
				app_id: '',  // Facebook app id for tracking shares. if provided, will use the facebook API
				caption: ''  // caption to be shared alongside your link to Facebook
			},
			twitter: {
				href: 'https://twitter.com/intent/tweet?text={{ title }}&url={{ url }}'
			},
			googlePlus: {
				href: 'https://plus.google.com/share?url={{ url }}'
			},
			tumblr: {
				href: 'http://www.tumblr.com/share/link?url={{ url }}&name={{ title }}&description={{ description }}&tags={{ hashtags }}&show-via=true'
			},
			pinterest: {
				href: 'http://pinterest.com/pin/create/button/?url={{ url }}&media={{ imageURL }}&description={{ title }}%20-%20{{ description }}'
			},
			reddit: {
				href: 'http://www.reddit.com/submit?url={{ url }}&title={{ title }}',
				href_text: 'https://www.reddit.com/submit?title={{ title }}&text={{ description }}'
			},
			linkedin: {
				href: 'http://www.linkedin.com/shareArticle?mini=true&url={{ url }}&title={{ title }}&summary={{ description }}&source={{ url }}'
			},
			email: {
				href: 'mailto:%20?subject={{ title }}&body={{ url }}%20-%20{{ description }}'
			},
			sms: {
				href: 'sms:%20&body={{ title }}%20-%20{{ url }}%20-%20{{ description }}'
			}
		},
		actions: {
			wolfram_calc: {
				href: 'http://www.wolframalpha.com/input/?i={{ term }}'
			},
			cisi: {
				href: 'http://www.canistream.it/search/movie/{{ term }}'
			},
			amazon: {
				href: 'https://www.amazon.com/s/field-keywords={{ term }}'
			},
			wikipedia: {
				href: 'https://en.wikipedia.org/w/index.php?search={{ term }}'
			}
		},
		location: {
			googleMaps_show: {
				// https://www.google.com/maps?q=33.514671899999996,-117.7216579
				href: 'https://www.google.com/maps?q={{ lat }},{{ lng }}'
			},
			googleMaps_nav: {
				// https://www.google.com/maps/dir/Current+Location/43.12345,-76.12345
				href: 'https://www.google.com/maps/dir/Current+Location/{{ lat }},{{ lng }}'
			},
			wolfram: {
				// http://www.wolframalpha.com/input/?i=48.8567+lat+2.3508+long
				href: 'http://www.wolframalpha.com/input/?i={{ lat }}%20latitude,%20{{ lng }}%20longitude'
			},
			weather: {
				// http://forecast.weather.gov/MapClick.php?lat=40.781581302919285&lon=-73.96648406982422
				href: 'http://forecast.weather.gov/MapClick.php?lat={{ lat }}&lon={{ lng }}'
			}
		}
	}
};

/**
 *
 * @type {{contacts: {actions: actionMap.contacts.actions, bar: actionMap.contacts.bar, share: actionMap.contacts.share}, content: {action: actionMap.content.action, bar: actionMap.content.bar, share: actionMap.content.share}, events: {action: actionMap.events.action, bar: actionMap.events.bar, share: actionMap.events.share}, locations: {bar: actionMap.locations.bar, location: actionMap.locations.location, share: actionMap.locations.share}, organizations: {action: actionMap.organizations.actions, bar: actionMap.organizations.bar, share: actionMap.organizations.share}, places: {action: actionMap.places.action, bar: actionMap.places.bar, location: actionMap.places.location, share: actionMap.places.share}, things: {action: actionMap.things.action, bar: actionMap.things.bar, share: actionMap.things.share}}}
 */
var actionMap = {
	contact: {
		actions: function(contact) {
			if (contact.name) {
				return actions.actions({
					wolfram_calc_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wolfram_calc.href, contact.name),
					wikipedia_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wikipedia.href, contact.name)
				});
			}
			return '';
		},
		bar: function(contact) {
			return nunjucks.render('explorer/components/action/bar.html', {
				share: true,
				location: false,
				action: contact.name || false
			});
		},
		share: function(contact) {
			return actions.share(
				null,
				URL_TEMPLATES.defaults.title,
				_prettyConcat([contact.source, contact.name, contact.handle]),
				''
			);
		}
	},
	content: {
		action: function(content) {
			if (_.includes(['audio', 'video', 'game'], content.type)) {
				return actions.actions({
					wolfram_calc_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wolfram_calc.href, content.title),
					cisi_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.cisi.href, content.title),
					amazon_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.amazon.href, content.title),
					wikipedia_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wikipedia.href, content.title)
				});
			}
			return '';
		},
		bar: function(content) {
			return nunjucks.render('explorer/components/action/bar.html', {
				share: true,
				location: false,
				action: _.includes(['audio', 'video', 'game'], content.type)
			});
		},
		share: function(content) {
			return actions.share(
				content.url || null,
				_prettyConcat([content.title, URL_TEMPLATES.defaults.title]),
				_prettyConcat([content.text || URL_TEMPLATES.defaults.description]),
				content.embed_thumbnail || ''
			);
		}
	},
	event: {
		action: function(event) {
			if (event.datetime) {
				var formattedDateTime = moment(event.datetime).format('MMMM Do, YYYY HH:mm:ss a zz');
				return actions.actions({
					wolfram_calc_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wolfram_calc.href, formattedDateTime),
					wikipedia_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wikipedia.href, formattedDateTime)
				});
			}
			return '';
		},
		bar: function(event) {
			return nunjucks.render('explorer/components/action/bar.html', {
				share: true,
				location: false,
				action: event.datetime || true
			});
		},
		share: function(event) {
			return actions.share(
				null,
				_prettyConcat([event.type, URL_TEMPLATES.defaults.title, URL_TEMPLATES.defaults.description]),
				_prettyConcat([event.provider_name, event.type, moment(event.datetime).format('MMMM Do, YYYY HH:mm:ss a zz')]),
				''
			);
		}
	},
	location: {
		bar: function() {
			nunjucks.render('explorer/components/action/bar.html', {
				share: true,
				location: false,
				action: false
			});
		},
		location: function(location) {
			return actions.location(
				location.geolocation[1],
				location.geolocation[0]
			);
		},
		share: function(location) {
			return actions.share(
				_hydrateLocationURL(URL_TEMPLATES.urls.location.googleMaps_show.href, location.geolocation[1], location.geolocation[0]),
				'',
				'',
				''
			);
		}
	},
	organization: {
		action: function actions(organization) {
			return actions.actions({
				wolfram_calc_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wolfram_calc.href, organization.title),
				wikipedia_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wikipedia.href, organization.title)
			});
		},
		bar: function(organization) {
			return nunjucks.render('explorer/components/action/bar.html', {
				share: (typeof (organization.url) === 'undefined'),
				location: false,
				action: true
			});
		},
		share: function share(organization) {
			if (typeof (organization.url) === 'undefined') {
				return actions.share(organization.title || organization.text,
					'',
					'',
					'');
			}
			return '';
		}
	},
	place: {
		action: function(place) {
			return actions.actions({
				wolfram_calc_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wolfram_calc.href, place.name || place.reverse_geolocation),
				wikipedia_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wikipedia.href, place.name || place.reverse_geolocation)
			});
		},
		bar: function() {
			return nunjucks.render('explorer/components/action/bar.html', {
				share: true,
				location: true,
				action: true
			});
		},
		location: function(place) {
			return actions.location(
				place.location.geolocation[1],
				place.location.geolocation[0]
			);
		},
		share: function(place) {
			return actions.share(
				_hydrateLocationURL(URL_TEMPLATES.urls.location.googleMaps_show.href, place.location.geolocation[1], place.location.geolocation[0]),
				'',
				'',
				''
			);
		}
	},
	thing: {
		action: function(thing) {
			return actions.actions({
				wolfram_calc_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wolfram_calc.href, thing.title),
				cisi_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.cisi.href, thing.title),
				amazon_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.amazon.href, thing.title),
				wikipedia_href: _hydrateActionURL(URL_TEMPLATES.urls.actions.wikipedia.href, thing.title)
			});
		},
		bar: function() {
			return nunjucks.render('explorer/components/action/bar.html', {
				share: true,
				location: false,
				action: true
			});
		},
		share: function(thing) {
			return actions.share(
				thing.url || null,
				_prettyConcat([thing.title, URL_TEMPLATES.defaults.title]),
				_prettyConcat([thing.text || URL_TEMPLATES.defaults.description]),
				thing.embed_thumbnail || ''
			);
		}
	}
};

/**
 *
 * @type {{location: actions.location, actions: actions.actions, share: actions.share}}
 */
var actions = {
	location: function(lat, lng) {
		return nunjucks.render('explorer/components/action/location.html', {
			googleMaps_show_href: _hydrateLocationURL(URL_TEMPLATES.urls.location.googleMaps_show.href, lat, lng),
			googleMaps_nav_href: _hydrateLocationURL(URL_TEMPLATES.urls.location.googleMaps_nav.href, lat, lng),
			weather_href: _hydrateLocationURL(URL_TEMPLATES.urls.location.weather.href, lat, lng),
			wolfram_href: _hydrateLocationURL(URL_TEMPLATES.urls.location.wolfram.href, lat, lng)
		});
	},
	actions: function(context) {
		return nunjucks.render('explorer/components/action/actions.html', context);
	},
	share: function(url, title, description, imageURL) {
		var facebookHref, googlePlusHref, redditHref;
		if (url !== null) {
			facebookHref = _hydrateShareURL(URL_TEMPLATES.urls.share.facebook.href, url, title, description, imageURL);
			googlePlusHref = _hydrateShareURL(URL_TEMPLATES.urls.share.googlePlus.href, url, title, description, imageURL);
			redditHref = _hydrateShareURL(URL_TEMPLATES.urls.share.reddit.href, url, title, description, imageURL);
		}
		else {
			redditHref = _hydrateShareURL(URL_TEMPLATES.urls.share.reddit.href_text, url, title, description, imageURL);
		}
		return nunjucks.render('explorer/components/action/share.html', {
			facebook_href: facebookHref,
			twitter_href: _hydrateShareURL(URL_TEMPLATES.urls.share.twitter.href, url, title.replace(' - Shared via BitScoop', '').slice(0, 60) + ' (via @BitScoopLabs)', description, imageURL),
			googlePlus_href: googlePlusHref,
			tumblr_href: _hydrateShareURL(URL_TEMPLATES.urls.share.tumblr.href, url, title, description, imageURL),
			pinterest_href: _hydrateShareURL(URL_TEMPLATES.urls.share.pinterest.href, url, title, description, imageURL),
			reddit_href: redditHref,
			linkedin_href: _hydrateShareURL(URL_TEMPLATES.urls.share.linkedin.href, url, title, description, imageURL),
			email_href: _hydrateShareURL(URL_TEMPLATES.urls.share.email.href, url, title, description, imageURL),
			sms_href: _hydrateShareURL(URL_TEMPLATES.urls.share.sms.href, url, title, description, imageURL)
		});
	}
};

/**
 *
 * @param str
 * @returns {string}
 * @private
 */
function _fixedEncodeURIComponent(str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
		return '%' + c.charCodeAt(0).toString(16);
	});
}

/**
 *
 * @param URLString
 * @param url
 * @param title
 * @param description
 * @param imageURL
 * @returns {XML|string}
 * @private
 */
function _hydrateShareURL(URLString, url, title, description, imageURL) {
	return URLString.replace('{{ url }}', _fixedEncodeURIComponent(url === null ? URL_TEMPLATES.defaults.url : url))
		.replace('{{ title }}', _fixedEncodeURIComponent(title === '' ? URL_TEMPLATES.defaults.title : title))
		.replace('{{ description }}', _fixedEncodeURIComponent(description === '' ? URL_TEMPLATES.defaults.description : description))
		.replace('{{ imageURL }}', _fixedEncodeURIComponent(imageURL === '' ? URL_TEMPLATES.defaults.imageURL : imageURL))
		.replace('{{ hashtags }}', _fixedEncodeURIComponent(URL_TEMPLATES.defaults.hashtags));
	//.replace('{{ via }}', _fixedEncodeURIComponent(URL_TEMPLATES.defaults.via));
}

/**
 *
 * @param URLString
 * @param lat
 * @param lng
 * @returns {XML|string}
 * @private
 */
function _hydrateLocationURL(URLString, lat, lng) {
	return URLString.replace('{{ lat }}', _fixedEncodeURIComponent(lat))
		.replace('{{ lng }}', _fixedEncodeURIComponent(lng));
}

/**
 *
 * @param URLString
 * @param term
 * @returns {string|XML|*|void}
 * @private
 */
function _hydrateActionURL(URLString, term) {
	return URLString.replace('{{ term }}', _fixedEncodeURIComponent(term));
}

/**
 *
 * @param stringArray
 * @returns {string}
 * @private
 */
function _prettyConcat(stringArray) {
	var result = '';
	_.forEach(stringArray, function(value) {
		if (value) {
			if (result.length > 0) {
				result += ' - ' + value;
			}
			else {
				result += value;
			}
		}
	});
	return result;
}

/**
 *
 * @param object
 * @param action
 * @returns {*}
 */
function renderAction(object, action) {
	var objectType = object.constructor.className.toLowerCase();

	return actionMap[objectType][action](object);
}

module.exports = {
	renderAction: renderAction,
	actions: actions,
	actionMap: actionMap
};
