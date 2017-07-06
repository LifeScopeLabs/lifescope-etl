const $ = require('jquery');
const _ = require('lodash');


function _toggleOneTooltip(event) {
	event.stopPropagation();
	var $triggerElement = $(this);
	var $tooltipElement = $triggerElement.parents().hasClass('.tooltip') ? $triggerElement.parents('.tooltip') : $triggerElement.siblings('.tooltip');
	if (!($tooltipElement.hasClass('visible'))) {
		$('body').find('.tooltip').removeClass('visible');
		$tooltipElement.toggleClass('visible');
	}
	else {
		$('body').find('.tooltip').removeClass('visible');
	}
}

function bindTooltip(triggerClass, closeClass) {
	$('body').on('click', triggerClass, _toggleOneTooltip);
	$('body').on('click', closeClass, _toggleOneTooltip);
}

module.exports = {
	bindTooltip: bindTooltip
};
