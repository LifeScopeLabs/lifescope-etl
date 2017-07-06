var native_toString = Object.prototype.toString;
var typeMap = {};


Array.prototype.map.call('Arguments Array Boolean Date Error Function Number Object RegExp String'.split(' '), function(d) {
	typeMap['[object ' + d + ']'] = d.toLowerCase();
});


/**
 * Placeholder.
 *
 * @param val
 */
function type(obj) {
	var type;

	if (obj === null) {
		return obj + '';
	}

	if (typeof obj === 'object' || typeof obj === 'function') {
		type = native_toString.call(obj);

		return typeMap[type] || 'object';
	}

	return typeof obj;
}


module.exports = type;
