const $ = require('jquery');
const cookies = require('cookies');


var navigator = window.navigator;

//Used by navigator.geolocation's functions - see https://developer.mozilla.org/en-US/docs/Web/API/PositionOptions
var options = {
	enableHighAccuracy: true,
	timeout: 10000,
	maximumAge: 0
};

//Stores margin of error for locations
var accuracyToleranceMultiplier;

//Set to false to disable console.log output
var logging = true;

//Temporary store of the most recent position retrievied by one of navigator.geolocation's functions
var lastPosition;

//The last position that was used to create a Location event during the current instantiation of this module.
//On instantiation, is set to the user's location.
var lastUpdatePosition;

//The last time a Location event was written during the current instantiation of this module.
//On instantiation, is set to the current time.
var lastUpdate;

var user_id;

//How long to wait out inaccurate locations before using whatever value is given, in seconds
var maxAccurateAge;
//How far away an inaccurate location has to be before it's used anyway
var maxAccurateDistance;

//Gets the distance between two coordinates on a 3D sphere
function getDistance(lat1, lon1, lat2, lon2) {
	var R = 6371; // Radius of earth in km
	var dLat = toRad(lat2 - lat1);
	var dLon = toRad(lon2 - lon1);
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c;
	return d * 1000;//Convert to meters instead of km
}

//Converts numeric degrees to radians
function toRad(Value) {
	return Value * Math.PI / 180;
}

//This just updates lastPosition with the current coordinates.
//It's passed a jQuery Deferred that is resolves last so that Events and Locations are not posted until this value has been updated.
function updateDistance(position, deferred) {
	lastPosition = position.coords;
	deferred.resolve();
}

//This sets lastPosition and lastUpdatePosition to the current coordinates, and is only called when an instance
//of this module first loads.
//It's passed a jQuery Deferred that it resolves last so that intervalCheck is not run until these values have been populated.
function initialPosition(position, deferred) {
	lastUpdatePosition = position.coords;
	lastPosition = lastUpdatePosition;
	lastUpdate = new Date();
	deferred.resolve();
}

//Posts the Location
function postLocation() {
	//Create the Location object that will be written to the DB
	var locationObject = {
		datetime: new Date(),
		geo_format: 'lat_lng',
		geolocation: [
			lastPosition.longitude,
			lastPosition.latitude
		],
		reverse_geo_format: 'address',
		resolution: lastPosition.accuracy,
		source: navigator.userAgent
	};

	var locationPost = {
		location: JSON.stringify(locationObject)
	};

	$.ajax({
		url: 'https://app.lifescope.io/locations',
		type: 'POST',
		data: locationPost,
		dataType: 'text',
		headers: {
			'X-CSRFToken': cookies.get('csrftoken')
		},
		xhrFields: {
			withCredentials: true
		}
	}).done(function(data, xhr, response) {
		if (logging) {
			console.log('Location Object mapped and posted successfully');
		}
	}).fail(function(data, xhr, response) {
		if (logging) {
			console.log('Location Object maplocation failed');
		}
	});
}

//Error callback for navigator.geolocation functions
function error(err) {
	console.warn('ERROR(' + err.code + '): ' + err.message);
}

//Calls navigator.geolocation.getCurrentPosition and returns the deferred object that was resolved in the callback
function getPosition(callback, deferred) {
	if (logging) {
		console.log('Attempting to get position at ' + new Date());
	}
	navigator.geolocation.getCurrentPosition(function(position) {
		callback(position, deferred);
	}, error, options);
	return deferred;
}

//Calls for a new Location and associated Event to be posted to the DB, but in some cases checks if the most recent location was
//accurate enough to do so.
function intervalCheck() {
	var distance;
	//If watchPosition is not undefined, then that function has been automatically checking for changes in the user's position
	//and updating lastPosition accordingly.
	if (navigator.geolocation.watchPosition) {
		//Get the distance between the position of the last Location posted to the DB and the current Location
		distance = getDistance(lastPosition.latitude, lastPosition.longitude, lastUpdatePosition.latitude, lastUpdatePosition.longitude);
		//We don't want inaccurate locations posted to the DB.

		//The accuracy of the last Location posted to the DB is multiplied by a variable factor,
		//and we check if the current Location's accuracy is less than this tolerance.
		//If so, then the current location is accurate enough to post to the DB, e.g. if the previous accuracy was 60m and
		//the tolerance multiplier is 10, then the current Location will be posted if its accuracy is within 600m.

		//If not, we then check if the time between now and the last good Location is greater than a maximum age.
		//If it is, then post the current Location anyway, e.g. if the max age is 30 minutes and the last good Location was
		//45 minutes ago, then post no matter how inaccurate the current Location is.

		//If not, then we finally check if the distance between the current Location and the last good Location is greater
		//than a maximum distance.
		//If so, then the user has moved far enough away to warrant posting a new Location, e.g. if the max distance is 10km,
		//then we should post new Locations that are more than 10km away from the last good one no matter how inaccurate.

		//If none of these conditions are true, then the current Location is too inaccurate to post, but the last good Location
		//is new enough and close enough to not force the current one to be posted anyway.
		if (lastPosition.accuracy < accuracyToleranceMultiplier * lastUpdatePosition.accuracy || new Date() - lastUpdate > maxAccurateAge * 1000 || distance > maxAccurateDistance * 1000) {
			postLocation();
		}
	}
	else {
		//If watchPosition is not defined in the current browser, then we have to make do with calling getPosition
		//every tDelta and posting whatever it gets back.
		var deferred = $.Deferred();
		$.when(getPosition(updateDistance, deferred)).done(function() {
			postLocation();
		});
	}
}

//The main position tracking function for this module.
//It takes in the user's ID and the tDelta they set, and the maxAccurateAge and Distance.
//It creates a new instance of Location, defined in this module with the first four of these inputs.
//It checks to see if the client implements navigator.geolocation, and if so will use those to get the user's location.
//if that isn't available, then it will do nothing other than output a message to the console saying it can't
//do geolocation.
function trackPosition(user_ID, tDelta, maxAccurateAgeInput, maxAccurateDistanceInput, accuracyToleranceMult) {
	var deferred = $.Deferred();

	//Set variables based on inputs or default values if not passed in
	user_id = user_ID;
	tDelta = (tDelta === null) ? 600 : tDelta;
	maxAccurateAge = (maxAccurateAge === null) ? 1800 : maxAccurateAgeInput;
	maxAccurateDistance = (maxAccurateDistance === null) ? 10 : maxAccurateDistanceInput;
	accuracyToleranceMultiplier = (accuracyToleranceMult === null) ? 10 : accuracyToleranceMult;

	//Check to see if navigator.geolocation is present
	if (navigator.geolocation) {
		//Set the initial position to where the user is when the page first loads
		$.when(getPosition(initialPosition, deferred)).done(function() {
			//If navigator.geolocation.watchPosition is available, then call that function.
			//This will periodically check if the user's position has changed, at which point
			//the current location will be updated.
			if (navigator.geolocation.watchPosition) {
				navigator.geolocation.watchPosition(function(position) {
					updateDistance(position, deferred);
					deferred = $.Deferred();
				}, error, options);
			}
			//Whether or not watchPosition is available, run intervalCheck every tDelta seconds.
			setInterval(intervalCheck, tDelta * 1000);
		});
	}
	//If navigator.geolocation isn't present, then output a debugging message.
	else {
		console.log('This browser does not support geolocation');
	}
}

function estimate() {
	$.ajax({
		url: 'https://app.lifescope.io/estimate',
		type: 'GET',
		dataType: 'text',
		headers: {
			'X-CSRFToken': cookies.get('csrftoken')
		},
		xhrFields: {
			withCredentials: true
		}
	}).done(function(data, xhr, response) {
		if (logging) {
			console.log('Reestimation successful');
		}
	}).fail(function(data, xhr, response) {
		if (logging) {
			console.log('Reestimation failed');
		}
	});
}

module.exports = {
	trackPosition: trackPosition,
	estimate: estimate
};
