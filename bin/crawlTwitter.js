#!/usr/bin/env node

require('dotenv').config();
const twitter = require('twitter-text');
const mongoose = require('mongoose');
const Twit = require('twit');
const sendMessage = require('../src/send-message');

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
]).then(([followerUsernamesContainer, seenTweetIdsContainer]) => {
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
	followerUsernames.concat('big_ben_clock').forEach(followerUsername => {
		const tweetsForUserPromises = [];
		userPromises.push(
			T.get('statuses/user_timeline', {
				screen_name: followerUsername,
				count: 100,
				exclude_replies: true,
				include_rts: false,
			}).then(result => {
				result.data.forEach(tweet => {
					if (seenTweetIds[tweet.id]) {
						// Already posted this tweet, move along!
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
			}),
		);
		Promise.all(userPromises).then(() => {
			if (!seenTweetIdsToUpdate.length) {
				console.log('no updates!');
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
					seenTweetIdsToUpdate.forEach(tweetId => {
						seenTweetIds[tweetId] = true;
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
});

function postTweet(tweet) {
	const user = tweet.user.screen_name;
	const id = tweet.id_str;
	const content = twitter.autoLinkWithJSON(tweet.text, tweet.entities);
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

	return sendMessage(message, user, 'mastodon.social').then(body => {
		// console.log('message sent to mastodon!');
		// TODO hardcoded destination domain
	});
}
