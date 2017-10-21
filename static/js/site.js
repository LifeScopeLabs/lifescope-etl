const $ = require('jquery');
const cookies = require('cookies');
const ga = require('ga');
const nunjucks = require('nunjucks');
require('jquery-regexp-selector');
require('templates');


var domain = 'lifescope.io';


$(document).ready(function() {
	var cookieConsent, html;

	cookieConsent = cookies.get('cookieconsent');

	if (!cookieConsent) {
		html = nunjucks.render('components/cookie-consent.html');
		$('body').append(html);
	}

	// TODO: Highlight active links?
	//$('a:regex(href,^' + location.pathname + ')').addClass('active');

	$(document).on('click', '.modal .content', function(e) {
		e.stopPropagation();
	});

	$(document).on('modalopen', function() {
		$('body').addClass('modal-open');
	});

	$(document).on('modalclose', function() {
		$('body').removeClass('modal-open');
	});

	$(document).on('click', '.cookie-consent button', function() {
		cookies.set('cookieconsent', true, {
			expires: 365,
			path: '/',
			domain: domain
		});

		$('.cookie-consent').remove();
	});
});

// Google Analytics dependency may be undefined if the user is running ad blockers or ghostery.
if (ga) {
	ga('create', 'UA-65896068-1', 'auto');
	ga('send', 'pageview');
}
