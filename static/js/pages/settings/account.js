const $ = require('jquery');
require('minimodal');


$(document).ready(function() {
	$(document).on('click', '#delete', function(e) {
		var $modal;

		$modal = $('#delete-modal');

		$modal.modal({
			position: false,
			postOpen: function() {
				$(this).css('display', 'flex');
			}
		})
	});

	$('#delete-modal').on('click', 'button', function(e) {
		if ($(this).is('.confirm')) {
			$.ajax({
				url: '/settings/account',
				method: 'DELETE',
				headers: {
					'X-CSRF-Token': window.csrftoken
				}
			}).done(function(data) {
				window.location.href = '/';
			});
		}
		else {
			$.modal.close();
		}
	});
});
