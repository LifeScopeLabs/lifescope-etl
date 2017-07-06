function hex(x) {
	return ('0' + parseInt(x).toString(16)).slice(-2);
}

function rgbToHex(rgb) {
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

	return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

module.exports = {
	calc: rgbToHex
};

