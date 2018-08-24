#!/usr/bin/env node

require('dotenv').config();

const DEBUG = !!process.env.debug;
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

const FollowerUsernamesModel = mongoose.model('FollowerUsernamesModel', {
	followerUsernames: [String],
});

const SeenTweetIdsModel = mongoose.model('SeenTweetIdsModel', {
	seenTweetIds: Object,
});

Promise.all([
	FollowerUsernamesModel.findOne(undefined).exec(),
	SeenTweetIdsModel.findOne(undefined).exec(),
	fetchFollowers(),
]).then(([followerUsernamesContainer, seenTweetIdsContainer, followerIds]) => {
	const seenTweetIdsToUpdate = [];
	let followerUsernames;
	let seenTweetIds;
	if (!followerUsernamesContainer) {
		followerUsernames = [];
	} else {
		followerUsernames = followerUsernamesContainer.followerUsernames;
	}
	if (!seenTweetIdsContainer) {
		seenTweetIds = {};
	} else {
		seenTweetIds = seenTweetIdsContainer.seenTweetIds;
	}

	const userPromises = [];
	const now = Date.now();
	followerUsernames.forEach(followerUsername => {
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
		}

		if (DEBUG) {
			process.exit(0);
		}
		SeenTweetIdsModel.findOne(undefined)
			.exec()
			.then(seenTweetIdsContainer => {
				let seenTweetIds;
				if (!seenTweetIdsContainer) {
					seenTweetIds = {};
				} else {
					seenTweetIds = seenTweetIdsContainer.seenTweetIds;
				}

				// cull out anything where the ts is older than 6 hours
				Object.keys(seenTweetIds).forEach(id => {
					const timestamp = seenTweetIds[id];
					if (timestamp === true) {
						delete seenTweetIds[id];
					} else if (now - timestamp > 6 * 60 * 60 * 1000) {
						console.log('I should delete this old tweet');
						delete seenTweetIds[id];
					}
				});

				seenTweetIdsToUpdate.forEach(tweetId => {
					seenTweetIds[tweetId] = now;
				});

				// remove old map, we've got a new one to store!
				SeenTweetIdsModel.remove(undefined, err => {
					const newSeenTweetIdsModel = new SeenTweetIdsModel({
						seenTweetIds,
					});
					// store the new map!
					newSeenTweetIdsModel.save(saveErr => {
						if (saveErr) {
							console.log('Error saving to database', saveErr);
						}
						console.log(
							`done! Saved ${seenTweetIdsToUpdate.length} new tweets!`,
						);
						process.exit(0);
					});
				});
			});
	});
});

function postTweet(tweet) {
	const { entities } = tweet;
	const user = tweet.user.screen_name;
	const id = tweet.id_str;
	let content =
		'<p>' + twitter.autoLinkWithJSON(tweet.full_text, tweet.entities) + '</p>';

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
		message.object.tag = entities.user_mentions.map(({ screenName }) => {
			return {
				type: 'Mention',
				href: `${domain}/users/${screenName.toLowerCase()}`,
				name: `@${screenName.toLowerCase()}@${domainWithoutHttps}`,
			};
		});
	}

	if (DEBUG) {
		return Promise.resolve();
	}
	return sendMessage(message, user, 'mastodon.social');
}

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
