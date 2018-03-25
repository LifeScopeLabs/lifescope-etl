'use strict';


function defineNonSerialized(obj, name) {
	let symbol = Symbol(name);

	Object.defineProperty(obj, name, {
		enumerable: true,
		get: function() {
			return this[symbol];
		},
		set: function(val) {
			this[symbol] = val;
		}
	});
}


module.exports = defineNonSerialized;
