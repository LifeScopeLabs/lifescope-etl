const $ = require('jquery');
const search = require('search');


var location = window.location;
var sessionStorage = window.sessionStorage;


$(document).ready(function() {
	$('.mobile-selector').on('click', function(e) {
		var $i, $pages, $this = $(this);

		$pages = $('.mobile-type-selector').first();
		$i = $this.find('i');

		if ($pages.is(':visible')) {
			$i.removeClass('fa-caret-up').addClass('fa-caret-down');
		}
		else {
			$i.removeClass('fa-caret-down').addClass('fa-caret-up');
		}

		$pages.toggle();
	});
});

$(search).on('search', function(e, done) {
	location.pathname = '/explore';
	done();
});

$(search).on('update', function(e, search) {
	if (search && search.id) {
		sessionStorage.setItem('qid', search.id);
	}
	else {
		sessionStorage.removeItem('qid');
	}
});
