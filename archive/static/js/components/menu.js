const $ = require('jquery');
require('minimodal');
require('templates');


function open() {
	$('#menu').addClass('open');
}

function close() {
	$('#menu').removeClass('open');
}

$(document).ready(function() {
	$(document).on('click', function(e) {
		var $menu, $target;

		$target = $(e.target);
		$menu = $('#menu');

		if ($menu.hasClass('open') && ($target.closest('#menu').length === 0)) {
			close();
		}
	});

	$(document).on('click', '#menu .menu header', close);

	$(document).on('click', '#menu-button', function(e) {
		e.stopPropagation();
		open();
	});

	$('#menu').on('click', '.menu .views > div:first-child, .menu .sort > div:first-child, .menu .facets > div:first-child', function(e) {
		var $siblings, $siblingsFirstChild, $siblingsLastChild, $this = $(this);

		$siblings = $this.parents('section').children('.sort, .views, .facets');
		$siblingsFirstChild = $siblings.children('div:first-child');
		$siblingsLastChild = $siblings.children('div:last-child');

		$siblingsFirstChild.find('i.fa-caret-up').removeClass('fa-caret-up').addClass('fa-caret-down');

		if ($this.hasClass('active')) {
			$siblingsFirstChild.removeClass('active');
			$siblingsLastChild.addClass('hidden');
			$this.parent('.sort, .views, .facets').find('i.fa-caret-up').removeClass('fa-caret-up').addClass('fa-caret-down');
		}
		else {
			$siblingsFirstChild.removeClass('active');
			$siblingsLastChild.addClass('hidden');

			$this.addClass('active');
			$this.parent().children('div:last-child').removeClass('hidden');
			$this.parent('.sort, .views, .facets').find('i.fa-caret-down').removeClass('fa-caret-down').addClass('fa-caret-up');
		}
	});
});

module.exports = {
	close: close,
	open: open
};
