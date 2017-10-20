const $ = require('jquery');
const _ = require('lodash');
const nunjucks = require('nunjucks');
require('jquery-mixitup');
require('templates');


var protocol = 'https';
var domain = 'lifescope.com';


function flipIcon() {
	if ($('body').hasClass('ctl-expand')) {
		$('.mobile-selector i').removeClass('fa-caret-down').addClass('fa-caret-up');
	}
	else {
		$('.mobile-selector i').removeClass('fa-caret-up').addClass('fa-caret-down');
	}
}

$(document).ready(function() {
	$('#provider-grid').mixItUp();

	$(document).on('click', '.mix', function(e) {
		var $connect, $self = $(this);

		$connect = $('#connection-modal');

		$connect.modal({
			position: false,
			preOpen: function() {
				var id;

				id = $self.attr('data-id');

				$.ajax({
					url: protocol + '://' + domain + '/api/providers/' + id,
					type: 'GET'
				})
					.then(function(provider) {
						var placeholder, $sources, $workflow;

						$workflow = $('#workflow');
						$sources = $('.sources');
						placeholder = 'My ' + provider.name + ' Account';

						$sources.empty();
						$workflow.attr('data-provider-id', provider.id);
						$workflow.find('i').removeClass().addClass('fa fa-' + provider.name.toLowerCase());
						$workflow.find('.header').html('New ' + provider.name + ' Connection');
						$workflow.find('input[name="provider_id"]').val(provider.id);
						$workflow.find('input[name="name"]').attr('placeholder', placeholder);
						$('.action button').html('Connect to ' + provider.name);

						_.forEach(provider.sources, function(source, name) {
							var $rendered;

							$rendered = nunjucks.render('components/source.html', {
								source_name: name,
								source: source
							});

							$sources.append($rendered);
						});
					});
			},
			postOpen: function() {
				var $this = $(this);

				$this.css('display', 'flex');
			}
		});
	});

	$('#done').on('click', function(e) {
		window.location.href = '/';
	});

	$(document).on('click', '.mobile-selector', function() {
		$('body').toggleClass('ctl-expand');
		flipIcon();
	});

	$(document).on('click', '.filter', function() {
		var $this = $(this);

		$('body').removeClass('ctl-expand');
		$('.mobile-selector').children('.placeholder-text').text($this.text());

		flipIcon();
	});
});
