const $ = require('jquery');


$(document).on('mousedown', function(e) {
	var $filtered, $set;

	$set = $(e.target).parents('.autoblur');
	$filtered = $('.autoblur').not($set);

	$filtered.trigger('autoblur:hide');
});
