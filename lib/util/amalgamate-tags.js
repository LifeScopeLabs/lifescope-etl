'use strict';

const _ = require('lodash');


function amalgamateTags(item) {
	let tagMasks = item.tagMasks;

	if (tagMasks != null) {
		let amalgamatedTags = tagMasks.source ? _.cloneDeep(tagMasks.source) : [];

		if (tagMasks.added) {
			let addedTags = tagMasks.added;

			_.forEach(addedTags, function(addedTag) {
				if (amalgamatedTags.indexOf(addedTag) === -1) {
					amalgamatedTags.push(addedTag);
				}
			});
		}

		if (tagMasks.removed) {
			let removedTags = tagMasks.removed;

			_.forEach(removedTags, function(removedTag) {
				let tagIndex = amalgamatedTags.indexOf(removedTag);

				if (tagIndex > -1) {
					amalgamatedTags.splice(tagIndex, 1);
				}
			});
		}

		item.tags = amalgamatedTags;
		delete item.tagMasks;
	}
}

module.exports = amalgamateTags;
