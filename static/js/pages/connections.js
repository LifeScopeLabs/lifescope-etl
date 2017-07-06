const $ = require('jquery');
const cookies = require('cookies');


$(document).ready(function() {
	$(document).on('submit', function(e) {
		var data, permissions, serialized, $form;

		e.preventDefault();

		$form = $(e.target).closest('form');

		serialized = {};
		$form.serializeArray().map(function(d) {
			serialized[d.name] = d.value;
		});

		if (!serialized['connection-name']) {
			serialized['connection-name'] = $form.find('input[name="connection-name"]').attr('placeholder');
		}

		data = {};
		permissions = data.permissions = [];
		data.updateFrequency = parseInt(serialized['update-frequency']);
		data.name = serialized['connection-name'];

		delete serialized['update-frequency'];
		delete serialized['connection-name'];

		$.each(serialized, function(d) {
			permissions.push(d);
		});

		data.permissions = JSON.stringify(data.permissions);

		$.ajax({
			url: $form.attr('action'),
			type: 'POST',
			'content-type': 'application/json',
			dataType: 'text',
			data: data,
			headers: {
				'X-CSRF-Token': window.csrftoken
			}
		}).done(function(data, xhr, response) {
			window.location.pathname = data;
		}).fail(function(data, xhr, response) {
		});

		return false;
	});
});
