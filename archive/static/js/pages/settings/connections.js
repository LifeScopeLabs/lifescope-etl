const $ = require('jquery');
const _ = require('lodash');
const cookies = require('cookies');
const debounce = require('debounce');
const formMonitor = require('form-monitor');
require('jquery-deparam');
require('minimodal');


$(document).ready(function() {
	var params;

	params = $.deparam(window.location.search.slice(1));

	if (params.provider) {
		$('.connection[data-provider-id="' + params.provider + '"]').addClass('active');
	}

	$(document).on('click', '.connection .title', function(e) {
		var $connection;

		$connection = $(this).closest('.connection');

		if (e.shiftKey) {
			$connection.toggleClass('active');
		}
		else if ($connection.hasClass('active')) {
			$connection.removeClass('active');
		}
		else {
			$connection.addClass('active')
				.siblings('.active').removeClass('active');
		}
	});

	$(document).formMonitor('form.auto');

	$(document).on('form-monitor', 'form.auto', debounce(function(e) {
		var sources, formData, id, serialized, $this = $(this);

		formData = e.formData;

		serialized = _.pick(formData, ['name', 'enabled']);
		id = $this.closest('.connection').data('id');
		sources = {};

		$.each(formData, function(key, value) {
			if (!serialized.hasOwnProperty(key)) {
				sources[key] = value;
			}
		});

		serialized.sources = sources;

		$.ajax({
			url: $this.attr('action'),
			method: 'PATCH',
			data: JSON.stringify(serialized),
			contentType: 'application/json',
			headers: {
				'X-CSRF-Token': window.csrftoken
			}
		}).always(function() {
			e.clearFormData();
		}).done(function(data) {
			formMonitor.done(formData, id);

			if (formData.hasOwnProperty('name')) {
				$this.closest('.connection').find('div.name').text(formData.name);
			}

			if (data.reauthorize) {
				$this.closest('.connection').find('.reauthorize').removeClass('hidden');
			}
		});
	}, 1000));

	$(document).on('click', 'button.disable, button.delete, button.enable', function(e) {
		var id, name, $connection, $modal, $this = $(this);

		$connection = $this.closest('.connection');
		id = $connection.data('id');
		name = $connection.find('.title .name').text();

		if ($this.is('.enable')) {
			$.ajax({
				url: '/settings/connections/' + id,
				method: 'PATCH',
				data: JSON.stringify({
					enabled: true
				}),
				contentType: 'application/json',
				headers: {
					'X-CSRF-Token': window.csrftoken
				}
			}).done(function() {
				$connection.removeClass('disabled');
				$this.addClass('danger disable')
					.removeClass('primary enable')
					.text('Disable');
			});
		}
		else {
			$modal = $($this.is('.disable') ? '#disable-modal' : '#delete-modal');

			$modal.data('connection-id', id).find('span.name').text(name);
			$modal.modal({
				position: false,
				postOpen: function() {
					$(this).css('display', 'flex');
				}
			});
		}
	});

	$(document).on('click', '.reauthorize button', function(e) {
		var id, $this = $(this);

		id = $this.closest('.connection').data('id');

		$.ajax({
			url: '/connections/' + id,
			method: 'PATCH',
			contentType: 'application/json',
			headers: {
				'X-CSRFToken': window.csrftoken
			}
		}).done(function(authObj) {
			window.location.href = authObj.redirectUrl;
		});
	});

	$('#disable-modal').on('click', 'button', function(e) {
		var data, id, $modal;

		if ($(this).is('.confirm')) {
			$modal = $.modal.obj;
			id = $modal.data('connection-id');

			data = {
				enabled: false
			};

			$.ajax({
				url: '/settings/connections/' + id,
				method: 'PATCH',
				data: JSON.stringify(data),
				contentType: 'application/json',
				headers: {
					'X-CSRF-Token': window.csrftoken
				}
			}).done(function() {
				$('.connection[data-id="' + id + '"]')
					.addClass('disabled')
					.find('button.disable')
					.removeClass('danger disable')
					.addClass('primary enable')
					.text('Enable');

				$.modal.close();
			});
		}
		else {
			$.modal.close();
		}
	});

	$('#delete-modal').on('click', 'button', function(e) {
		var id, $modal;

		if ($(this).is('.confirm')) {
			$modal = $.modal.obj;
			id = $modal.data('connection-id');

			$.ajax({
				url: '/settings/connections/' + id,
				method: 'DELETE',
				headers: {
					'X-CSRF-Token': window.csrftoken
				}
			}).done(function(data) {
				$('.connection[data-id="' + id + '"]').remove();
				$.modal.close();
			}).fail(function(err) {
				$('#delete-modal .instructions').addClass('hidden');
				$('#delete-modal .last-connection').removeClass('hidden');

				setTimeout(function() {
					$('#delete-modal .instructions').removeClass('hidden');
					$('#delete-modal .last-connection').addClass('hidden');
				}, 3000);

			});
		}
		else {
			$.modal.close();
		}
	});
});
