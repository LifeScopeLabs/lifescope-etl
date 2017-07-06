'use strict';

const crypto = require('crypto');


/**
 * Get the signature/digest of a supplied input string.
 *
 * @param data The String to encode
 * @param secretKey Secret key shared with Amazon
 * @param [algorithm] Encryption algorithm, defaults to sha256
 * @param [encoding] The output encoding. Default to base64
 * @returns String with encoded digest of the input string
 */
function generateHmac(data, secretKey, algorithm, encoding) {
	encoding = encoding || 'hex';
	algorithm = algorithm || 'sha256';

	return crypto.createHmac(algorithm, secretKey).update(data).digest(encoding);
}


module.exports = generateHmac;
