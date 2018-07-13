'use strict';

const _ = require('lodash');
const moment = require('moment');

const mongoTools = require('../../../util/mongo-tools');


let tagRegex = /#[^#\s]+/g;


module.exports = function(data, db) {
	var contacts, content, events, objectCache, tags;

	let bodyTags, descriptionTags, messageTags, newTags, titleTags;

	objectCache = {
		contacts: {},
		content: {},
		tags: {}
	};

	contacts = [];
	content = [];
	tags = [];
	events = [];

	if (data && data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			let item = data[i];

			let newFile = {};
			let localFiles = [];
			let localFilesIds = {};
			let newContact = {};
			let localContacts = [];
			let localContactsIds = {};

			let newEvent = {
				type: 'created',
				provider_name: 'github',
				identifier: this.connection._id.toString('hex') + ':::created:::github:::' + item.id,
				connection_id: this.connection._id,
				provider_id: this.connection.provider_id,
				user_id: this.connection.user_id
			};

			let skipEvent = false;
			let comment;

			switch(item.type) {
				case 'ForkEvent':
					newTags = [];

					titleTags = item.payload.forkee.full_name ? item.payload.forkee.full_name.match(tagRegex) : null;

					if (titleTags != null) {
						for (let j = 0; j < titleTags.length; j++) {
							let tag = titleTags[j].slice(1);

							let newTag = {
								tag: tag,
								user_id: this.connection.user_id
							};

							if (!_.has(objectCache.tags, newTag.tag)) {
								objectCache.tags[newTag.tag] = newTag;

								tags.push(objectCache.tags[newTag.tag]);
							}

							if (newTags.indexOf(newTag.tag) === -1) {
								newTags.push(newTag.tag);
							}
						}
					}

					descriptionTags = item.payload.forkee.description ? item.payload.forkee.description.match(tagRegex) : null;

					if (descriptionTags != null) {
						for (let j = 0; j < descriptionTags.length; j++) {
							let tag = descriptionTags[j].slice(1);

							let newTag = {
								tag: tag,
								user_id: this.connection.user_id
							};

							if (!_.has(objectCache.tags, newTag.tag)) {
								objectCache.tags[newTag.tag] = newTag;

								tags.push(objectCache.tags[newTag.tag]);
							}

							if (newTags.indexOf(newTag.tag) === -1) {
								newTags.push(newTag.tag);
							}
						}
					}

					newFile = {
						identifier: this.connection._id.toString('hex') + ':::fork:::github:::' + item.payload.forkee.id,
						url: item.payload.forkee.html_url,
						remote_id: item.payload.forkee.id,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'github',
						owner: item.payload.forkee.owner.login,
						title: item.payload.forkee.full_name,
						text: item.payload.forkee.description,
						'tagMasks.source': newTags,
						type: 'code',
						user_id: this.connection.user_id
					};

					if (!_.has(objectCache.content, newFile.identifier)) {
						objectCache.content[newFile.identifier] = newFile;

						localFiles.push(objectCache.content[newFile.identifier]);
						localFilesIds[newFile.identifier] = true;

						content.push(objectCache.content[newFile.identifier]);
					}
					else {
						if (!_.has(localFilesIds, newFile.identifier)) {
							localFiles.push(objectCache.content[newFile.identifier]);
							localFilesIds[newFile.identifier] = true;
						}
					}

					newEvent.context = 'Forked Repository';
					newEvent.datetime = moment(item.created_at).utc().toDate();

					//newContact = {
					//	identifier: this.connection._id.toString('hex') + ':::github:::' + item.repo_info.owner.id,
					//  connection_id: this.connection._id,
					//  provider_id: this.connection.provider_id,
					// provider_name: 'github',
					//	user_id: this.connection.user_id,
					//	remote_id: item.repo_info.owner.id,
					//	handle: item.repo_info.owner.login,
					//	name: item.repo_info.user.name
					//};
					//
					//contacts.push(newContact);
					//localContacts.push(newContact);

					break;

				case 'PullRequestEvent':
					newTags = [];

					if (item.payload.pull_request.title != null) {
						titleTags = item.payload.pull_request.title.match(tagRegex);

						if (titleTags != null) {
							for (let j = 0; j < titleTags.length; j++) {
								let tag = titleTags[j].slice(1);

								let newTag = {
									tag: tag,
									user_id: this.connection.user_id
								};

								if (!_.has(objectCache.tags, newTag.tag)) {
									objectCache.tags[newTag.tag] = newTag;

									tags.push(objectCache.tags[newTag.tag]);
								}

								if (newTags.indexOf(newTag.tag) === -1) {
									newTags.push(newTag.tag);
								}
							}
						}
					}

					if (item.payload.pull_request.body != null) {
						bodyTags = item.payload.pull_request.body.match(tagRegex);

						if (bodyTags != null) {
							for (let j = 0; j < bodyTags.length; j++) {
								let tag = bodyTags[j].slice(1);

								let newTag = {
									tag: tag,
									user_id: this.connection.user_id
								};

								if (!_.has(objectCache.tags, newTag.tag)) {
									objectCache.tags[newTag.tag] = newTag;

									tags.push(objectCache.tags[newTag.tag]);
								}

								if (newTags.indexOf(newTag.tag) === -1) {
									newTags.push(newTag.tag);
								}
							}
						}
					}

					newFile = {
						identifier: this.connection.user_id.toString('hex') + ':::pull_request:::github:::' + item.payload.pull_request.id,
						url: item.payload.pull_request.html_url,
						remote_id: item.payload.pull_request.id,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'github',
						owner: item.payload.pull_request.user.login,
						title: item.payload.pull_request.title,
						text: item.payload.pull_request.body,
						'tagMasks.source': newTags,
						type: 'code',
						user_id: this.connection.user_id
					};

					if (!_.has(objectCache.content, newFile.identifier)) {
						objectCache.content[newFile.identifier] = newFile;

						localFiles.push(objectCache.content[newFile.identifier]);
						localFilesIds[newFile.identifier] = true;

						content.push(objectCache.content[newFile.identifier]);
					}
					else {
						if (!_.has(localFilesIds, newFile.identifier)) {
							localFiles.push(objectCache.content[newFile.identifier]);
							localFilesIds[newFile.identifier] = true;
						}
					}

					switch(item.payload.action) {
						case 'opened':
							newEvent.context = 'Opened pull request';
							newEvent.datetime = moment(item.created_at).utc().toDate();

							break;

						case 'reopened':
							newEvent.context = 'Reopened pull request';
							newEvent.type = 'edited';
							newEvent.datetime = moment(item.updated_at).utc().toDate();

							break;

						case 'closed':
							newEvent.context = 'Closed pull request';
							newEvent.type = 'edited';
							newEvent.datetime = moment(item.closed_at).utc().toDate();

							break;

						case 'labeled':
							newEvent.context = 'Labeled pull request';
							newEvent.type = 'edited';
							newEvent.datetime = moment(item.updated_at).utc().toDate();

							break;

						case 'unlabeled':
							newEvent.context = 'Unlabeled pull request';
							newEvent.type = 'edited';
							newEvent.datetime = moment(item.updated_at).utc().toDate();

							break;

						case 'assigned':
							newEvent.context = 'Assigned pull request';
							newEvent.type = 'edited';
							newEvent.datetime = moment(item.updated_at).utc().toDate();

							break;

						case 'unassigned':
							newEvent.context = 'Unassigned pull request';
							newEvent.type = 'edited';
							newEvent.datetime = moment(item.updated_at).utc().toDate();

							break;

						case 'synchronized':
							newEvent.context = 'Synchronized pull request';
							newEvent.type = 'edited';
							newEvent.datetime = moment(item.updated_at).utc().toDate();

							break;

						default:
							break;
					}

					//newContact = {
					//	identifier: this.connection._id.toString('hex') + ':::github:::' + item.repo_info.owner.id,
					//  connection_id: this.connection._id,
					//  provider_id: this.connection.provider_id,
					// provider_name: 'github',
					//	user_id: this.connection.user_id,
					//	remote_id: item.repo_info.owner.id,
					//	handle: item.repo_info.owner.login,
					//	name: item.repo_info.user.name
					//};
					//
					//contacts.push(newContact);
					//localContacts.push(newContact);

					break;

				case 'PushEvent':
					for (let j = 0; j < item.payload.commits.length; j++) {
						let commit = item.payload.commits[j];
						newTags = [];

						messageTags = commit.message ? commit.message.match(tagRegex) : null;

						if (messageTags != null) {
							for (let k = 0; k < messageTags.length; k++) {
								let tag = messageTags[k].slice(1);

								let newTag = {
									tag: tag,
									user_id: this.connection.user_id
								};

								if (!_.has(objectCache.tags, newTag.tag)) {
									objectCache.tags[newTag.tag] = newTag;

									tags.push(objectCache.tags[newTag.tag]);
								}

								if (newTags.indexOf(newTag.tag) === -1) {
									newTags.push(newTag.tag);
								}
							}
						}

						newFile = {
							identifier: this.connection._id.toString('hex') + ':::push:::github:::' + commit.sha,
							url: commit.url,
							remote_id: commit.id,
							connection_id: this.connection._id,
							provider_id: this.connection.provider_id,
							provider_name: 'github',
							owner: commit.author.name,
							'tagMasks.source': newTags,
							title: 'Commit ' + commit.sha,
							text: commit.message,
							type: 'code',
							user_id: this.connection.user_id
						};

						if (!_.has(objectCache.content, newFile.identifier)) {
							objectCache.content[newFile.identifier] = newFile;

							localFiles.push(objectCache.content[newFile.identifier]);
							localFilesIds[newFile.identifier] = true;

							content.push(objectCache.content[newFile.identifier]);
						}
						else {
							if (!_.has(localFilesIds, newFile.identifier)) {
								localFiles.push(objectCache.content[newFile.identifier]);
								localFilesIds[newFile.identifier] = true;
							}
						}

						newContact = {
							identifier: this.connection._id.toString('hex') + ':::github:::' + commit.author.email,
							connection_id: this.connection._id,
							provider_id: this.connection.provider_id,
							provider_name: 'github',
							user_id: this.connection.user_id,
							remote_id: commit.author.email,
							handle: commit.author.email,
							name: commit.author.name
						};

						if (!_.has(objectCache.contacts, newContact.identifier)) {
							objectCache.contacts[newContact.identifier] = newContact;

							localContacts.push(objectCache.contacts[newContact.identifier]);
							localContactsIds[newContact.identifier] = true;

							contacts.push(objectCache.contacts[newContact.identifier]);
						}
						else {
							if (!_.has(localContactsIds, newContact.identifier)) {
								localContacts.push(objectCache.contacts[newContact.identifier]);
								localContactsIds[newContact.identifier] = true;
							}
						}
					}

					newEvent.context = 'Pushed commits';
					newEvent.datetime = moment(item.created_at).utc().toDate();

					break;

				case 'CreateEvent':
					newFile = {
						identifier: this.connection._id.toString('hex') + ':::' + item.payload.ref_type + ':::github:::' + item.repo.id + '/' + item.payload.ref,
						url: item.repo.url + '/tree/' + item.payload.ref,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'github',
						title: item.repo.name + '/' + item.payload.ref,
						type: 'code',
						user_id: this.connection.user_id
					};

					if (!_.has(objectCache.content, newFile.identifier)) {
						objectCache.content[newFile.identifier] = newFile;

						localFiles.push(objectCache.content[newFile.identifier]);
						localFilesIds[newFile.identifier] = true;

						content.push(objectCache.content[newFile.identifier]);
					}
					else {
						if (!_.has(localFilesIds, newFile.identifier)) {
							localFiles.push(objectCache.content[newFile.identifier]);
							localFilesIds[newFile.identifier] = true;
						}
					}

					switch(item.payload.ref_type){
						case 'repository':
							newEvent.context = 'Created new repository';

							break;

						case 'branch':
							newEvent.context = 'Created new branch';

							break;

						case 'tag':
							newEvent.context = 'Created new tag';

							break;

						default:
							break;
					}

					newEvent.datetime = moment(item.created_at).utc().toDate();

					//newContact = {
					//	identifier: this.connection._id.toString('hex') + ':::github:::' + item.repo_info.owner.id,
					//  connection_id: this.connection._id,
					//  provider_id: this.connection.provider_id,
					// provider_name: 'github',
					//	user_id: this.connection.user_id,
					//	remote_id: item.repo_info.owner.id,
					//	handle: item.repo_info.owner.login,
					//	name: item.repo_info.user.name
					//};
					//
					//contacts.push(newContact);
					//localContacts.push(newContact);

					break;

				case 'DeleteEvent':
					newFile = {
						identifier: this.connection._id.toString('hex') + ':::' + item.payload.ref_type + ':::github:::' + item.repo.id + '/' + item.payload.ref,
						url: item.repo.url + '/tree/' + item.payload.ref,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'github',
						title: item.repo.name + '/' + item.payload.ref,
						type: 'code',
						user_id: this.connection.user_id
					};

					if (!_.has(objectCache.content, newFile.identifier)) {
						objectCache.content[newFile.identifier] = newFile;

						localFiles.push(objectCache.content[newFile.identifier]);
						localFilesIds[newFile.identifier] = true;

						content.push(objectCache.content[newFile.identifier]);
					}
					else {
						if (!_.has(localFilesIds, newFile.identifier)) {
							localFiles.push(objectCache.content[newFile.identifier]);
							localFilesIds[newFile.identifier] = true;
						}
					}

					newEvent.context = item.payload.ref_type === 'branch' ? 'Deleted branch' : 'Deleted tag';
					newEvent.type = 'edited';
					newEvent.datetime = moment(item.created_at).utc().toDate();

					//newContact = {
					//	identifier: this.connection._id.toString('hex') + ':::github:::' + item.repo_info.owner.id,
					//  connection_id: this.connection._id,
					//  provider_id: this.connection.provider_id,
					// provider_name: 'github',
					//	user_id: this.connection.user_id,
					//	remote_id: item.repo_info.owner.id,
					//	handle: item.repo_info.owner.login,
					//	name: item.repo_info.user.name
					//};
					//
					//contacts.push(newContact);
					//localContacts.push(newContact);

					break;

				case 'IssuesEvent':
					let issue = item.payload.issue;
					newTags = [];
					titleTags = issue.title ? issue.title.match(tagRegex) : null;

					if (titleTags != null) {
						for (let k = 0; k < titleTags.length; k++) {
							let tag = titleTags[k].slice(1);

							let newTag = {
								tag: tag,
								user_id: this.connection.user_id
							};

							if (!_.has(objectCache.tags, newTag.tag)) {
								objectCache.tags[newTag.tag] = newTag;

								tags.push(objectCache.tags[newTag.tag]);
							}

							if (newTags.indexOf(newTag.tag) === -1) {
								newTags.push(newTag.tag);
							}
						}
					}

					bodyTags = issue.body ? issue.body.match(tagRegex) : null;

					if (bodyTags != null) {
						for (let k = 0; k < bodyTags.length; k++) {
							let tag = bodyTags[k].slice(1);

							let newTag = {
								tag: tag,
								user_id: this.connection.user_id
							};

							if (!_.has(objectCache.tags, newTag.tag)) {
								objectCache.tags[newTag.tag] = newTag;

								tags.push(objectCache.tags[newTag.tag]);
							}

							if (newTags.indexOf(newTag.tag) === -1) {
								newTags.push(newTag.tag);
							}
						}
					}

					newFile = {
						identifier: this.connection.user_id.toString('hex') + ':::issue:::github:::' + issue.id,
						url: issue.html_url,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'github',
						'tagMasks.source': newTags,
						title: issue.title,
						type: 'code',
						text: issue.body,
						user_id: this.connection.user_id
					};

					switch(item.payload.action) {
						case 'opened':
							newEvent.context = 'Opened issue';
							newEvent.datetime = moment(issue.created_at).utc().toDate();

							break;

						case 'reopened':
							newEvent.context = 'Reopened issue';
							newEvent.type = 'edited';
							newEvent.datetime = moment(issue.updated_at).utc().toDate();

							break;

						case 'closed':
							newEvent.context = 'Closed issue';
							newEvent.type = 'edited';
							newEvent.datetime = moment(issue.closed_at).utc().toDate();

							break;

						case 'labeled':
							newEvent.context = 'Labeled issue';
							newEvent.type = 'edited';
							newEvent.datetime = moment(issue.updated_at).utc().toDate();

							break;

						case 'unlabeled':
							newEvent.context = 'Unlabeled issue';
							newEvent.type = 'edited';
							newEvent.datetime = moment(issue.updated_at).utc().toDate();

							break;

						case 'assigned':
							newEvent.context = 'Assigned issue';
							newEvent.type = 'edited';
							newEvent.datetime = moment(issue.updated_at).utc().toDate();

							break;

						case 'unassigned':
							newEvent.context = 'Unassigned issue';
							newEvent.type = 'edited';
							newEvent.datetime = moment(issue.updated_at).utc().toDate();

							break;

						default:
							break;
					}

					if (!_.has(objectCache.content, newFile.identifier)) {
						objectCache.content[newFile.identifier] = newFile;

						localFiles.push(objectCache.content[newFile.identifier]);
						localFilesIds[newFile.identifier] = true;

						content.push(objectCache.content[newFile.identifier]);
					}
					else {
						if (!_.has(localFilesIds, newFile.identifier)) {
							localFiles.push(objectCache.content[newFile.identifier]);
							localFilesIds[newFile.identifier] = true;
						}
					}

					if (issue.assignee && issue.assignee.login !== this.connection.metadata.login) {
						newContact = {
							identifier: this.connection._id.toString('hex') + ':::github:::' + issue.assignee.id,
							connection_id: this.connection._id,
							provider_id: this.connection.provider_id,
							provider_name: 'github',
							user_id: this.connection.user_id,
							avatar_url: issue.assignee.avatar_url,
							remote_id: issue.assignee.id,
							handle: issue.assignee.login
						};

						if (!_.has(objectCache.contacts, newContact.identifier)) {
							objectCache.contacts[newContact.identifier] = newContact;

							localContacts.push(objectCache.contacts[newContact.identifier]);
							localContactsIds[newContact.identifier] = true;

							contacts.push(objectCache.contacts[newContact.identifier]);
						}
						else {
							if (!_.has(localContactsIds, newContact.identifier)) {
								localContacts.push(objectCache.contacts[newContact.identifier]);
								localContactsIds[newContact.identifier] = true;
							}
						}
					}

					if (issue.user && issue.user.login !== this.connection.metadata.login) {
						newContact = {
							identifier: this.connection._id.toString('hex') + ':::github:::' + issue.user.id,
							connection_id: this.connection._id,
							provider_id: this.connection.provider_id,
							provider_name: 'github',
							user_id: this.connection.user_id,
							avatar_url: issue.user.avatar_url,
							remote_id: issue.user.id,
							handle: issue.user.login
						};

						if (!_.has(objectCache.contacts, newContact.identifier)) {
							objectCache.contacts[newContact.identifier] = newContact;

							localContacts.push(objectCache.contacts[newContact.identifier]);
							localContactsIds[newContact.identifier] = true;

							contacts.push(objectCache.contacts[newContact.identifier]);
						}
						else {
							if (!_.has(localContactsIds, newContact.identifier)) {
								localContacts.push(objectCache.contacts[newContact.identifier]);
								localContactsIds[newContact.identifier] = true;
							}
						}
					}

					break;

				case 'IssueCommentEvent':
					comment = item.payload.comment;
					newTags = [];
					bodyTags = comment.body ? comment.body.match(tagRegex) : null;

					if (bodyTags != null) {
						for (let k = 0; k < bodyTags.length; k++) {
							let tag = bodyTags[k].slice(1);

							let newTag = {
								tag: tag,
								user_id: this.connection.user_id
							};

							if (!_.has(objectCache.tags, newTag.tag)) {
								objectCache.tags[newTag.tag] = newTag;

								tags.push(objectCache.tags[newTag.tag]);
							}

							if (newTags.indexOf(newTag.tag) === -1) {
								newTags.push(newTag.tag);
							}
						}
					}

					newFile = {
						identifier: this.connection._id.toString('hex') + ':::comment:::github:::' + comment.id,
						url: comment.html_url,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'github',
						'tagMasks.source': newTags,
						type: 'text',
						text: comment.body,
						user_id: this.connection.user_id
					};

					if (!_.has(objectCache.content, newFile.identifier)) {
						objectCache.content[newFile.identifier] = newFile;

						localFiles.push(objectCache.content[newFile.identifier]);
						localFilesIds[newFile.identifier] = true;

						content.push(objectCache.content[newFile.identifier]);
					}
					else {
						if (!_.has(localFilesIds, newFile.identifier)) {
							localFiles.push(objectCache.content[newFile.identifier]);
							localFilesIds[newFile.identifier] = true;
						}
					}

					newEvent.context = 'Commented on issue';
					newEvent.type = 'commented';
					newEvent.datetime = moment(comment.created_at).utc().toDate();

					break;

				case 'PullRequestReviewCommentEvent':
					comment = item.payload.comment;
					newTags = [];
					bodyTags = comment.body ? comment.body.match(tagRegex) : null;

					if (bodyTags != null) {
						for (let k = 0; k < bodyTags.length; k++) {
							let tag = bodyTags[k].slice(1);

							let newTag = {
								tag: tag,
								user_id: this.connection.user_id
							};

							if (!_.has(objectCache.tags, newTag.tag)) {
								objectCache.tags[newTag.tag] = newTag;

								tags.push(objectCache.tags[newTag.tag]);
							}

							if (newTags.indexOf(newTag.tag) === -1) {
								newTags.push(newTag.tag);
							}
						}
					}

					newFile = {
						identifier: this.connection._id.toString('hex') + ':::comment:::github:::' + comment.id,
						url: comment.html_url,
						connection_id: this.connection._id,
						provider_id: this.connection.provider_id,
						provider_name: 'github',
						'tagMasks.source': newTags,
						type: 'text',
						text: comment.body,
						user_id: this.connection.user_id
					};

					if (!_.has(objectCache.content, newFile.identifier)) {
						objectCache.content[newFile.identifier] = newFile;

						localFiles.push(objectCache.content[newFile.identifier]);
						localFilesIds[newFile.identifier] = true;

						content.push(objectCache.content[newFile.identifier]);
					}
					else {
						if (!_.has(localFilesIds, newFile.identifier)) {
							localFiles.push(objectCache.content[newFile.identifier]);
							localFilesIds[newFile.identifier] = true;
						}
					}

					newEvent.context = 'Commented on Pull Request';
					newEvent.type = 'commented';
					newEvent.datetime = moment(comment.created_at).utc().toDate();

					break;

				default:
					skipEvent = true;
					break;
			}

			if (!skipEvent) {
				newEvent.content = localFiles;
				newEvent.contacts = localContacts;

				events.push(newEvent);
			}
		}

		return mongoTools.mongoInsert({
			contacts: contacts,
			content: content,
			events: events,
			tags: tags
		}, db);
	}
	else {
		return Promise.resolve(null);
	}
};
