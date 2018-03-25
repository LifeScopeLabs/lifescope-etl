const $ = require('jquery');


var validLabels = /^(data|css):/;
var regexFlags = 'ig';

$.expr[':'].regex = function(elem, index, match) {
	var matchParams, method, property, re;

	matchParams = match[3].split(',');
	method = matchParams[0].match(validLabels) ? matchParams[0].split(':')[0] : 'attr';
	property = matchParams.shift().replace(validLabels, '');
	re = new RegExp(matchParams.join('').replace(/^s+|s+$/g, ''), regexFlags);

	return re.test($(elem)[method](property));
};
