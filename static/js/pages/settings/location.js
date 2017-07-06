const $ = require('jquery');
const cookies = require('cookies');
const debounce = require('debounce');
const formMonitor = require('form-monitor');


$(document).ready(function() {
	$(document).formMonitor('form.auto');

	$(document).on('form-monitor', 'form.auto', debounce(function(e) {
		$.ajax({
			url: $(this).attr('action'),
			method: 'PATCH',
			data: $.param(e.formData),
			dataType: 'json',
			headers: {
				'X-CSRF-Token': window.csrftoken
			}
		}).always(function() {
			e.clearFormData();
		}).done(function(data) {
			formMonitor.done(data);
		}).fail(function(response) {
			formMonitor.fail(response.responseJSON);
		});
	}, 1000));
});
