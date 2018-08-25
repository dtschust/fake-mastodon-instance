#!/usr/bin/env node

require('dotenv').config();

const DEBUG = !!process.env.DEBUG;
const twitter = require('twitter-text');
const mongoose = require('mongoose');
const Twit = require('twit');
const sendMessage = require('../src/send-message');

const mockFollowersArray = require('../src/mock-followers-array');

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

const username = 'nuncatest';
T.get('users/lookup', { screen_name: username }).then(result => {
	const data = result.data[0];
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
		object: {
			id: `${domain}/users/${username}`,
			type: 'Person',
			preferredUsername: username,
			name: `🤖 ${data.name}`,
			summary: `${
				data.description
			} (this is a fake account, acting as a bridge to a real twitter account. You cannot follow it, only the developer can)`,
			url: `${domain}/@${username}`,
			manuallyApprovesFollowers: true,
			image: [
				{
					url: `${data.profile_banner_url}`,
					type: 'Image',
				},
			],
			inbox: `${domain}/inbox`,
			icon: [
				{
					url: `${data.profile_image_url.replace('_normal', '_400x400')}`,
					type: 'Image',
				},
			],
			publicKey: {
				id: `${domain}/users/${username}#main-key`,
				owner: `${domain}/users/${username}`,
				publicKeyPem: process.env.INSTANCE_PUBLIC_KEY,
			},
		},
	};
	sendMessage(profileUpdate, username, 'mastodon.social').then(body => {
		// TODO dynamic domain
		console.log('profile updated!', body);
		process.exit(0);
	});
});

/*
const FollowingUsernameModel = mongoose.model('FollowingUsername', {
	username: String,
});

const SeenTweetIdModel = mongoose.model('SeenTweetIdModel', {
	timestamp: Number,
	id: Number,
});

Promise.all([
	FollowingUsernameModel.find(undefined).exec(),
	SeenTweetIdModel.find(undefined).exec(),
	fetchFollowers(),
]).then(([followingUsernameContainer, seenTweetIdsContainer, followerIds]) => {
	const seenTweetIdsToUpdate = [];
	let followingUsernames;
	let seenTweetIds;
	if (!followingUsernameContainer) {
		followingUsernames = [];
	} else {
		followingUsernames = followingUsernameContainer.map(
			({ username }) => username,
		);
	}
	if (!seenTweetIdsContainer) {
		seenTweetIds = {};
	} else {
		seenTweetIds = {};
		seenTweetIdsContainer.forEach(({ id, timestamp }) => {
			seenTweetIds[id] = timestamp;
		});
	}

	const userPromises = [];
	const now = Date.now();
	followingUsernames.forEach(followerUsername => {
		const tweetsForUserPromises = [];
		userPromises.push(
			T.get('statuses/user_timeline', {
				screen_name: followerUsername,
				count: 100,
				exclude_replies: false,
				include_rts: false,
				tweet_mode: 'extended',
			})
				.then(result => {
					const tweetsInReverseOrder = result.data.slice().reverse();
					tweetsInReverseOrder.forEach(tweet => {
						if (seenTweetIds[tweet.id]) {
							// Already posted this tweet, move along!
							return;
						}

						if (
							now - new Date(tweet.created_at).getTime() >
							2 * 60 * 60 * 1000
						) {
							// Tweet is old, ignore it
							return;
						}

						if (
							tweet.in_reply_to_user_id &&
							followerIds.indexOf(tweet.in_reply_to_user_id) === -1
						) {
							// don't post tweet if it's in reply to someone
							// @nuncamind doesn't follow!
							return;
						}

						tweetsForUserPromises.push(
							postTweet(tweet).then(() => {
								// console.log('post tweet complete!');
								seenTweetIdsToUpdate.push(tweet.id);
							}),
						);
					});
					return Promise.all(tweetsForUserPromises);
				})
				.catch(e => {
					console.log('ERROR!', followerUsername, e);
				}),
		);
	});
	Promise.all(userPromises).then(() => {
		if (!seenTweetIdsToUpdate.length) {
			console.log('no updates!');
			process.exit(0);
			return;
		}

		if (DEBUG) {
			process.exit(0);
		}

		// Cull out old tweets, delete anything older than 6 hours
		SeenTweetIdModel.deleteMany(
			{ timestamp: { $lte: now - 6 * 60 * 60 * 1000 } },
			err => {
				if (err) {
					console.log('Error culling the seen tweet database');
				}
			},
		);

		const seenTweetIdsUpdatesPromises = [];
		let count = 0;
		seenTweetIdsToUpdate.forEach(id => {
			const promise = new Promise(resolve => {
				// store the new user to follow, if we aren't already storing them!
				SeenTweetIdModel.findOne({ id }, (err, response) => {
					if (err) {
						console.log(`Error querying the database for ${id}`);
						return;
					}
					if (response) {
						// Nothing to do, we're already storing this tweet.
						resolve();
						return;
					}

					const newSeenTweetId = new SeenTweetIdModel({
						id,
						timestamp: now,
					});

					newSeenTweetId.save(saveErr => {
						if (saveErr) {
							console.log('Error saving to database', saveErr);
						}
						console.log(`done! Now storing tweet ${id}!`);
						count += 1;
						resolve();
					});
				});
			});
			seenTweetIdsUpdatesPromises.push(promise);
		});

		Promise.all(seenTweetIdsUpdatesPromises).then(() => {
			console.log(`done! Saved ${count} new tweets!`);
			process.exit(0);
		});
	});
});

function postTweet(tweet) {
	const { entities } = tweet;
	const user = tweet.user.screen_name;
	const id = tweet.id_str;
	let content = `<p>${twitter.autoLinkWithJSON(
		tweet.full_text,
		tweet.entities,
	)}</p>`;

	// Convert @user to look like @user@twitter.com to be less confusing
	if (entities.user_mentions && entities.user_mentions.length) {
		entities.user_mentions.forEach(({ screenName }) => {
			content = content.replace(
				new RegExp(
					`@<a class="tweet-url username" href="https://twitter.com/${screenName}" data-screen-name="${screenName}" rel="nofollow">${screenName}</a>`,
					'g',
				),
				`<a href="${domain}/@${screenName.toLowerCase()}" class="u-url mention">@${screenName}</a>`,
			);
		});
	}
	const message = {
		'@context': 'https://www.w3.org/ns/activitystreams',

		id: `${domain}/status-updates/${user}/status/${id}`,
		type: 'Create',
		actor: `${domain}/users/${user}`,
		to: 'https://www.w3.org/ns/activitystreams#Public', // TODO figure out how to make these not public

		object: {
			id: `${domain}/status/${user}/${id}`,
			type: 'Note',
			published: new Date(tweet.created_at).toISOString(),
			attributedTo: `${domain}/users/${user}`,
			content,
			to: 'https://www.w3.org/ns/activitystreams#Public', // TODO figure out how to make these not public
		},
	};

	// iterate through user mentions and add tags to the message object, so
	// mastodon knows about these mentions
	const domainWithoutHttps = domain.replace('https://', '');
	if (entities.user_mentions && entities.user_mentions.length) {
		message.object.tag = entities.user_mentions.map(({ screenName }) => ({
			type: 'Mention',
			href: `${domain}/users/${screenName.toLowerCase()}`,
			name: `@${screenName.toLowerCase()}@${domainWithoutHttps}`,
		}));
	}

	if (DEBUG) {
		return Promise.resolve();
	}
	return sendMessage(message, user, 'mastodon.social');
}
// eslint-disable-next-line camelcase
function fetchFollowers(prevFollowerIds = [], next_cursor) {
	if (DEBUG) {
		return Promise.resolve(mockFollowersArray);
	}

	// TODO actually fetch the followers, perhaps persisting in a database also
	// The code is in tweet-test.js, just port it over dude!
	return T.get('friends/list', {
		screen_name: 'nuncamind',
		count: 200,
		include_user_entities: false,
		cursor: next_cursor,
	}).then(response => {
		const followerIds = prevFollowerIds.concat(
			response.data.users.map(({ id }) => id),
		);
		if (response.data.next_cursor) {
			return fetchFollowers(followerIds, response.data.next_cursor);
		}

		console.log(`nuncamind is following ${followerIds.length} accounts`);
		return followerIds;
	});
}
*/
