#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const Twit = require('twit');
const sendMessage = require('../src/send-message');

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

const FollowerIdsModel = mongoose.model('FollowerIdsModel', {
	followerIds: [String],
});

const SeenTweetIdsModel = mongoose.model('SeenTweetIdsModel', {
	seenTweetIds: Object,
});

Promise.all([
	FollowerIdsModel.findOne(undefined).exec(),
	SeenTweetIdsModel.findOne(undefined).exec(),
]).then(([followerIdsContainer, seenTweetIdsContainer]) => {
	const seenTweetIdsToUpdate = [];
	let followerIds;
	let seenTweetIds;
	if (!followerIdsContainer) {
		followerIds = [];
	} else {
		followerIds = followerIdsContainer.followerIds;
	}
	if (!seenTweetIdsContainer) {
		seenTweetIds = {};
	} else {
		seenTweetIds = seenTweetIdsContainer.seenTweetIds;
	}

	const userPromises = [];
	followerIds.concat('792518').forEach(followerId => {
		const tweetsForUserPromises = [];
		userPromises.push(
			T.get('statuses/user_timeline', {
				user_id: followerId,
				count: 40,
				exclude_replies: true,
				include_rts: false,
			}).then(result => {
				tweetsForUserPromises.push(
					result.data.forEach(tweet => {
						if (seenTweetIds[tweet.id]) {
							// Already posted this tweet, move along!
							return Promise.resolve();
						}

						return postTweet(tweet).then(() => {
							seenTweetIdsToUpdate.push(tweet.id);
						});
					}),
				);
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
				.then(seenTweetIds => {
					if (!seenTweetIds) {
						seenTweetIds = {};
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

// TODO: implement
function postTweet(tweet) {
	return Promise.resolve();
}
