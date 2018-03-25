const $ = require('jquery');


var DEFAULT_DESKTOP_EMBED_WIDTH = 600; //px

var VIDEO_TEMPLATE = '<iframe src="https://www.youtube.com/embed/ONYQpbmHyVs" frameBorder="0" width="___width___" height="___height___" allowfullscreen></iframe>';


function resizeVideo() {
	var height, iframe, margin, width;

	if (window.outerWidth < DEFAULT_DESKTOP_EMBED_WIDTH) {
		margin = parseInt($('.scroller > div').css('margin-left').replace('px', ''));
		width = window.outerWidth - (2 * margin);
	}
	else {
		width = DEFAULT_DESKTOP_EMBED_WIDTH;
	}

	height = width * 9 / 16;

	iframe = VIDEO_TEMPLATE.replace('___width___', width).replace('___height___', height);

	$('.video').html(iframe);
}

$(document).ready(resizeVideo);

$(window).on('resize', resizeVideo);
