const $ = require('jquery');
const rgbToHex = require('rgb-to-hex');


var $document = $(document);
var HEX_COLOR_PATTERN = '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$';

$document.ready(function() {
	$document.on('click', '.color-picker .options > div', function() {
		var selectedColor, $options, $preview, $this = $(this);

		$options = $this.closest('.options');
		$preview = $options.siblings('.preview');
		selectedColor = $this.css('background-color');

		$preview.find('label').css('background-color', selectedColor);
		$preview.find('input').val(rgbToHex.calc(selectedColor));

		$('#favorite .data > i').css('color', selectedColor);
	});

	$document.on('click', '.icon-picker .options > i', function() {
		var icon, $preview, $this = $(this);

		$preview = $('#favorite .data > i');
		icon = $this.attr('class');

		$preview.attr('class', icon);
	});

	$document.on('click', '.icon-picker #clear-icon', function() {
		$('#favorite .data > i').attr('class', 'fa fa-times transparent');
	});

	$document.on('change keyup paste', '.color-picker #color-edit', function() {
		var $this = $(this);

		if ($this.val().length > 7) {
			$this.val($this.val().slice(0, 8));
		}

		if ($this.val()[0] !== '#') {
			$this.val('#' + $this.val());
		}

		if (!$this.val().match(HEX_COLOR_PATTERN)) {
			$this.siblings('span').html('Invalid');
		}
		else {
			$this.siblings('span').empty();
			$this.siblings('label').css('background-color', $this.val());
			$('#favorite .data > i').css('color', $this.val());
		}
	});
});
