const $ = require('jquery');


var AUDIO_TEMPLATE = '<audio controls style="width: ___width___, height: ___height___"><source src="___embed_content___" type="___type___"></audio>';
var EMAIL_IFRAME_TEMPLATE = '<iframe src="" frameBorder="0" width="___width___" height="___height___"></iframe>';
var IFRAME_TEMPLATE = '<iframe src="___embed_content___" frameBorder="0" width="___width___" height="___height___"></iframe>';
var IMAGE_TEMPLATE = '<img src="___embed_content___" alt="___title___"/>';
var VIDEO_TEMPLATE = '<video width="___width___" height="___height___" controls><source src="___embed_content___" type="___type___"></video>';

var DEFAULT_EMBED_WIDTH = '100%';
var DEFAULT_DESKTOP_EMBED_WIDTH = 600; //px
var DEFAULT_EMBED_HEIGHT = 500;  //px

var EMBED_FORMAT_TEMPLATE_CONTEXTS = {
	mp4: {
		tag: 'video',
		type: 'video/mp4'
	},
	oggv: {
		tag: 'video',
		type: 'video/ogg'
	},
	webm: {
		tag: 'video',
		type: 'video/webm'
	},
	mp3: {
		tag: 'audio',
		type: 'audio/mp3'
	},
	ogga: {
		tag: 'audio',
		type: 'audio/audio'
	},
	wav: {
		tag: 'audio',
		type: 'audio/wav'
	},
	png: {
		tag: 'image'
	},
	jpg: {
		tag: 'image'
	},
	jpeg: {
		tag: 'image'
	},
	svg: {
		tag: 'image'
	},
	tiff: {
		tag: 'image'
	},
	bmp: {
		tag: 'image'
	},
	webp: {
		tag: 'image'
	},
	email: {
		tag: 'iframe'
	},
	iframe: {
		tag: 'iframe'
	},
	link: {
		tag: 'iframe'
	}
};

function isMobile() {
	if (window.matchMedia) {
		return window.matchMedia('(max-device-width: 1080px) and (min-device-pixel-ratio: 1.5)').matches;
	}
	else {
		return false;
	}
}

/**
 *
 * @param HTML
 * @param height
 * @param width
 * @returns {XML|string}
 * @private
 */
function _replaceHeightWidth(HTML, width, height) {
	return HTML.replace('___height___', height).replace('___width___', width);
}

/**
 *
 * @param URL
 * @param type
 * @returns {string}
 * @private
 */
function _generateAudioTag(URL, type) {
	return AUDIO_TEMPLATE.replace('___embed_content___', URL).replace('___type___', type);
}

/**
 *
 * @param contentId
 * @returns {string}
 * @private
 */
function _generateEmailIframe(contentId) {
	return EMAIL_IFRAME_TEMPLATE.replace('___content_id___', contentId);
}

/**
 *
 * @param URL
 * @returns {string}
 * @private
 */
function _generateIframe(URL) {
	return IFRAME_TEMPLATE.replace('___embed_content___', URL);
}

/**
 *
 * @param URL
 * @returns {string}
 * @private
 */
function _generateImgTag(URL) {
	return IMAGE_TEMPLATE.replace('___embed_content___', URL);
}

/**
 *
 * @param URL
 * @param type
 * @returns {string}
 * @private
 */
function _generateVideoTag(URL, type) {
	return VIDEO_TEMPLATE.replace('___embed_content___', URL).replace('___type___', type);
}

/**
 * Creates a string containing the HTML tag of the embeded content out of the content object.
 *
 * TODO: Handle PROXY and API Calls to get protected content.
 *
 * @param content
 * @param $element
 * @param height
 * @param width
 * @returns {*|{arity, flags, keyStart, keyStop, step}|void}
 */
function renderEmbed(content, $element, width, height) {
	var context, embedFormat, HTML, scaleRatio, $iframe;

	if (!width) {
		if (isMobile()) {
			width = DEFAULT_EMBED_WIDTH;
		}
		else {
			width = DEFAULT_DESKTOP_EMBED_WIDTH;
		}
	}

	if (!height) {
		height = DEFAULT_EMBED_HEIGHT;
	}

	if (content.embed_format) {
		embedFormat = content.embed_format.toLowerCase();
		context = EMBED_FORMAT_TEMPLATE_CONTEXTS[embedFormat];

		if (embedFormat == 'email') {
			HTML = _replaceHeightWidth(_generateEmailIframe(content.id), width, height);
			$element.append(HTML);
			$iframe = $element.find('iframe')[0];

			if ($iframe.contentDocument) {
				$iframe.contentDocument.body.innerHTML = content.embed_content;
			}

			return $element;
		}
		else if (embedFormat == 'link') {
			HTML = _replaceHeightWidth(_generateIframe(content.embed_content), width, height);

			return $element.append(HTML);
		}

		if (context.tag == 'iframe') {
			HTML = content.embed_content;

			$element.append(HTML);
			$iframe = $element.find('iframe');

			if (!isMobile() && $iframe.width() > DEFAULT_DESKTOP_EMBED_WIDTH) {
				scaleRatio = $iframe.height() / $iframe.width();
				$iframe.attr('width', width);
				$iframe.attr('height', $iframe.width() * scaleRatio);
			}

			$element.parents('.object').find('.thumbnail').hide();

			return $element;
		}

		if (context.tag == 'audio') {
			HTML = _replaceHeightWidth(_generateAudioTag(content.embed_content), width, height);

			return $element.append(HTML);
		}

		if (context.tag == 'image') {
			HTML = _generateImgTag(content.embed_content);

			$element.parents('.object').find('.thumbnail').hide();

			return $element.append(HTML);
		}

		if (context.tag == 'video') {
			HTML = _replaceHeightWidth(_generateVideoTag(content.embed_content, context.type), width, height);

			$element.parents('.object').find('.thumbnail').hide();

			return $element.append(HTML);
		}
	}

	return false;
}

module.exports = renderEmbed;
