#!/usr/bin/env node

require('dotenv').config();

const mongoose = require('mongoose');
const Twit = require('twit');
const sendMessage = require('../src/send-message');
const getUserJson = require('../src/get-user-json');

const domain = process.env.DOMAIN;

const T = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token: process.env.TWITTER_ACCESS_TOKEN,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	strictSSL: true, // optional - requires SSL certificates to be valid.
});

mongoose.Promise = global.Promise;
mongoose.connect(
	process.env.MONGO_DB_URI,
	{
		useMongoClient: true,
	},
);

const FollowingUsernameModel = mongoose.model('FollowingUsername', {
	username: String,
});

console.log('Updating profiles for all users being followed');
FollowingUsernameModel.find(undefined)
	.exec()
	.then(followingUsernameContainer => {
		let followingUsernames;
		if (!followingUsernameContainer) {
			console.log('Cannot find any following users to update!');
			process.exit(0);
		} else {
			followingUsernames = followingUsernameContainer.map(
				({ username }) => username,
			);
		}
		const userPromises = [];
		// followingUsernames.forEach(username => {
		// TODO what if we have more than 100 screen names?
		if (followingUsernames.length >= 100) {
			console.log('Cannot update more than 100 right now!');
			process.exit(0);
		}
		T.get('users/lookup', { screen_name: followingUsernames.join(',') }).then(
			result => {
				result.data.forEach(data => {
					const username = data.screen_name;
					const profileUpdate = {
						'@context': [
							'https://www.w3.org/ns/activitystreams',
							'https://w3id.org/security/v1',
							{
								manuallyApprovesFollowers: 'as:manuallyApprovesFollowers',
								sensitive: 'as:sensitive',
								movedTo: { '@id': 'as:movedTo', '@type': '@id' },
								Hashtag: 'as:Hashtag',
								ostatus: 'http://ostatus.org#',
								atomUri: 'ostatus:atomUri',
								inReplyToAtomUri: 'ostatus:inReplyToAtomUri',
								conversation: 'ostatus:conversation',
								toot: 'http://joinmastodon.org/ns#',
								Emoji: 'toot:Emoji',
								focalPoint: { '@container': '@list', '@id': 'toot:focalPoint' },
								featured: { '@id': 'toot:featured', '@type': '@id' },
								schema: 'http://schema.org#',
								PropertyValue: 'schema:PropertyValue',
								value: 'schema:value',
							},
						],
						id: `${domain}/${username}#profileupdates/${Date.now()}`,
						type: 'Update',
						actor: `${domain}/users/${username}`,
						to: ['https://www.w3.org/ns/activitystreams#Public'],
						object: getUserJson(username, data),
					};
					// userPromises.push(
					// 	sendMessage(profileUpdate, username, 'mastodon.social').then(
					// 		body => {
					// 			console.log('profile updated!', body);
					// 		},
					// 	),
					// );
					userPromises.push(
						sendMessage(profileUpdate, username, 'xoxo.zone').then(body => {
							console.log('profile updated!', body);
						}),
					);
				});
				Promise.all(userPromises).then(() => {
					console.log('Done!');
					process.exit(0);
				});
			},
		);
	});
