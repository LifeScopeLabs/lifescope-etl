require.config({
	paths: {
		site: window.staticUrl + 'js/site.min',
		templates: window.staticUrl + 'js/templates.min',

		// Components
		favorite: window.staticUrl + 'js/components/favorite.min',
		menu: window.staticUrl + 'js/components/menu.min',
		search: window.staticUrl + 'js/components/search.min',
		tooltip: window.staticUrl + 'js/components/tooltip.min',

		// Pages
		'account-settings': window.staticUrl + 'js/pages/settings/account.min',
		connections: window.staticUrl + 'js/pages/connections.min',
		'connection-settings': window.staticUrl + 'js/pages/settings/connections.min',
		'location-settings': window.staticUrl + 'js/pages/settings/location.min',
		'profile-settings': window.staticUrl + 'js/pages/settings/profile.min',
		providers: window.staticUrl + 'js/pages/providers.min',
		start: window.staticUrl + 'js/pages/start.min',
		'settings-base': window.staticUrl + 'js/pages/settings/base.min',
		'user-home': window.staticUrl + 'js/pages/user-home.min',

		// Tools
		autoblur: window.staticUrl + 'js/tools/autoblur.min',
		filters: window.staticUrl + 'js/tools/filters.min',
		icons: window.staticUrl + 'js/tools/icons.min',
		location: window.staticUrl + 'js/tools/location.min',
		'rgb-to-hex': window.staticUrl + 'js/tools/rgb-to-hex.min',
		type: window.staticUrl + 'js/tools/type.min',

		// Explorer
		embed: window.staticUrl + 'js/explorer/embed.min',
		explorer: window.staticUrl + 'js/explorer/explorer.min',
		actions: window.staticUrl + 'js/explorer/actions.min',
		'objects': window.staticUrl + 'js/explorer/objects.min',

		// Extensions
		'jquery-regexp-selector': window.staticUrl + 'lib/jquery/plugins/regexp-selector.min',
		'nunjucks-env': window.staticUrl + 'lib/nunjucks/environments/default.min'
	}
});

requirejs.config({
	paths: {
		bluebird: 'https://cdnjs.cloudflare.com/ajax/libs/bluebird/3.3.4/bluebird.min',  // https://github.com/petkaantonov/bluebird
		'bootstrap-collapse': 'https://cdn.rawgit.com/twbs/bootstrap/master/js/collapse', // https://github.com/twbs/bootstrap
		'bootstrap-transition': 'https://cdn.rawgit.com/twbs/bootstrap/master/js/transition', // https://github.com/twbs/bootstrap
		cartano: 'https://cdn.bitscoop.com/cartano/0.2.0/cartano-0.2.0.min',  // https://bitbucket.org/bitscooplabs/cartano
		cookies: 'https://cdnjs.cloudflare.com/ajax/libs/js-cookie/2.1.2/js.cookie.min',  // https://github.com/js-cookie/js-cookie
		datetimepicker: 'https://cdn.rawgit.com/Eonasdan/bootstrap-datetimepicker/master/src/js/bootstrap-datetimepicker', //
		debounce: 'https://cdn.bitscoop.com/debounce/0.1.0/debounce-0.1.0.min',  // https://bitbucket.org/bitscooplabs/debounce
		'deferred-ap': 'https://cdn.bitscoop.com/deferred-ap/0.0.1/deferred-ap-0.0.1.min',  // https://github.com/sjberry/deferred-ap
		'form-monitor': 'https://cdn.bitscoop.com/form-monitor/0.1.0/form-monitor-0.1.0.min',  // https://bitbucket.org/bitscooplabs/form-monitor
		history: 'https://cdn.bitscoop.com/history/0.1.0/history-0.1.0.min',  // https://bitbucket.org/bitscooplabs/history
		humanize: 'https://cdnjs.cloudflare.com/ajax/libs/humanize-plus/1.6.0/humanize.min',  // https://github.com/HubSpot/humanize
		jquery: 'https://code.jquery.com/jquery-2.1.4.min',  // https://github.com/jquery/jquery
		'jquery-deparam': 'https://cdn.bitscoop.com/jquery-deparam/0.4.2/jquery-deparam-0.4.2.min',  // https://github.com/AceMetrix/jquery-deparam
		'jquery-deserialize': 'https://cdn.bitscoop.com/jquery-deserialize/1.3.2/jquery.deserialize-1.3.2.min',  // https://github.com/kflorence/jquery-deserialize
		'jquery-mixitup': 'https://cdn.jsdelivr.net/jquery.mixitup/2.1.8/jquery.mixitup.min', //https://github.com/patrickkunka/mixitup
		'leaflet-awesome-markers': 'https://cdnjs.cloudflare.com/ajax/libs/Leaflet.awesome-markers/2.0.2/leaflet.awesome-markers.min',  // https://github.com/lvoogdt/Leaflet.awesome-markers
		'leaflet-draw': 'https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-draw/v0.2.2/leaflet.draw',  // https://github.com/Leaflet/Leaflet.draw
		'leaflet-draw-drag': 'https://cdn.bitscoop.com/leaflet-draw-drag/0.1.2/Leaflet.draw.drag-0.1.2.min',  // https://github.com/w8r/Leaflet.draw.drag
		'leaflet-featuregroup-subgroup': 'https://cdn.rawgit.com/ghybs/Leaflet.FeatureGroup.SubGroup/v1.0.0/dist/leaflet.featuregroup.subgroup',  // https://github.com/ghybs/Leaflet.FeatureGroup.SubGroup
		'leaflet-fullscreen': 'https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.4/Leaflet.fullscreen.min',  // https://github.com/Leaflet/Leaflet.fullscreen
		'leaflet-markercluster': 'https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-markercluster/v0.4.0/leaflet.markercluster',  // https://github.com/Leaflet/Leaflet.markercluster
		'leaflet-zoomslider': 'https://api.tiles.mapbox.com/mapbox.js/plugins/leaflet-zoomslider/v0.7.0/L.Control.Zoomslider',  // https://github.com/kartena/Leaflet.zoomslider
		lodash: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.1/lodash.min',  // https://github.com/lodash/lodash
		mapbox: 'https://api.tiles.mapbox.com/mapbox.js/v2.2.1/mapbox',  // https://github.com/mapbox/mapbox.js
		'mapbox-directions': 'https://api.tiles.mapbox.com/mapbox.js/plugins/mapbox-directions.js/v0.1.0/mapbox.directions', // https://github.com/mapbox/mapbox-directions.js
		minimodal: 'https://cdn.bitscoop.com/minimodal/0.1.3/minimodal-0.1.3.min',  // https://github.com/sjberry/minimodal
		moment: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.10.6/moment.min', //http://momentjs.com/
		nunjucks: 'https://cdn.bitscoop.com/nunjucks/2.4.1/nunjucks-2.4.1.min',  // https://github.com/mozilla/nunjucks
		throttle: 'https://cdn.bitscoop.com/throttle/0.1.0/throttle-0.1.0.min',  // https://bitbucket.org/bitscooplabs/throttle
		twemoji: 'https://twemoji.maxcdn.com/twemoji.min',  // https://github.com/twitter/twemoji
		viewstate: 'https://cdn.bitscoop.com/viewstate/0.1.0/viewstate-0.1.0.min',  // https://bitbucket.org/bitscooplabs/viewstate

		// Google Analytics Shim
		ga: 'https://www.google-analytics.com/analytics'
	},

	map: {
		'*': {
			'promises-ap': 'bluebird',
			'nunjucks': 'nunjucks-env'
		},

		'nunjucks-env': {
			'nunjucks': 'nunjucks'
		}
	},

	shim: {
		'bootstrap-collapse': {
			deps: ['jquery']
		},

		'bootstrap-transition': {
			deps: ['jquery']
		},

		datetimepicker: {
			deps: ['bootstrap-collapse', 'bootstrap-transition']
		},

		ga: {
			exports: 'ga'
		},

		humanize: {
			exports: 'Humanize'
		},

		'jquery-deserialize': {
			deps: ['jquery']
		},

		'jquery-mixitup': {
			deps: ['jquery']
		},

		'leaflet-awesome-markers': {
			deps: ['leaflet']
		},

		'leaflet-draw': {
			deps: ['leaflet']
		},

		'leaflet-draw-drag': {
			deps: ['leaflet-draw']
		},

		'leaflet-fullscreen': {
			deps: ['leaflet']
		},

		'leaflet-markercluster': {
			deps: ['leaflet']
		},

		mapbox: {
			exports: 'L.mapbox'
		},

		'mapbox-directions': {
			deps: ['mapbox']
		},

		nunjucks: {
			exports: 'nunjucks'
		},

		twemoji: {
			exports: 'twemoji'
		}

	}
});

define('leaflet', ['mapbox'], function(mapbox) {
	return window.L;
});
