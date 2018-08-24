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

const SeenTweetIds = mongoose.model('SeenTweetIds', {
	seenTweetIds: Object,
});

Promise.all([
	FollowerIdsModel.findOne(undefined).exec(),
	SeenTweetIds.findOne(undefined).exec(),
]).then(([followerIds, seenTweetIds]) => {
	const seenTweetIdsToUpdate = [];
	if (!followerIds) {
		followerIds = [];
	}
	if (!seenTweetIds) {
		seenTweetIds = {};
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
				process.exit(0);
			}),
		);
	});
});

// TODO: implement
function postTweet(tweet) {
	return Promise.resolve();
}
/*
let storedEpisodesModel;
FemFreqEpisodesModel.findOne(undefined)
	.exec()
	.then(newStoredEpisodesModel => {
		storedEpisodesModel = newStoredEpisodesModel || { episodes: {}, order: [] };
		fetchNewEpisodes();
	})
	.catch(e => {
		console.log('Huh, we have an error', e);
		process.exit(0);
	});

async function fetchNewEpisodes() {
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});
	const page = await browser.newPage();
	await page.goto('https://d.rip/login');

	await page.waitForSelector('#user_session_email');
	const usernameInput = await page.$('#user_session_email');
	const passwordInput = await page.$('#user_session_password');
	await page.click('#user_session_email');
	await page.keyboard.type(process.env.KICKSTARTER_LOGIN);

	await page.click('#user_session_password');
	await page.keyboard.type(process.env.KICKSTARTER_PASSWORD);

	await page.click('input[value="Log in with Kickstarter"]');

	await page.waitForNavigation();

	await page.goto('https://d.rip/femfreq');

	await page.waitForSelector('audio');

	const episodeContainers = await page.$$('.grid-row');
	const titlesHandles = await page.$$('h1 a');
	const descriptionsHandles = await page.$$('div.rich-text p');
	const audioEmbeds = await page.$$('audio');

	const urls = await Promise.all(
		audioEmbeds.map(async audioEmbed => {
			const src = await page.evaluate(audioEmbed => audioEmbed.src, audioEmbed);
			return src;
		}),
	);

	const titles = await Promise.all(
		titlesHandles.map(async titleHandle => {
			const src = await page.evaluate(
				titleHandle => titleHandle.innerText,
				titleHandle,
			);
			return src;
		}),
	);

	const descriptions = await Promise.all(
		descriptionsHandles.map(async descriptionHandle => {
			const src = await page.evaluate(
				descriptionHandle => descriptionHandle.innerText,
				descriptionHandle,
			);
			return src;
		}),
	);

	const episodes = urls
		.map((url, i) => ({
			url,
			title: titles[i],
			description: descriptions[i],
			pubDate: pubDate(new Date(Date.now() - i * 1000)),
		}))
		.reverse();

	let newEpisodesFound = false;
	episodes.forEach(episode => {
		const urlKey = episode.url.replace(/\./g, ''); // can't store periods in keys for mongodb
		if (!storedEpisodesModel.episodes[urlKey]) {
			storedEpisodesModel.episodes[urlKey] = episode;
			storedEpisodesModel.order.push(urlKey);
			newEpisodesFound = true;
		}
	});

	if (newEpisodesFound) {
		// remove old map, we've got a new one to store!
		FemFreqEpisodesModel.remove(undefined, err => {
			const newStoredEpisodesModel = new FemFreqEpisodesModel(
				storedEpisodesModel,
			);
			// store the new savedToots map!
			newStoredEpisodesModel.save(saveErr => {
				if (saveErr) {
					console.log('Error saving to database', saveErr);
				}
				console.log(`done! Saved new episodes!`);
				browser.close().then(() => {
					process.exit(0);
				});
			});
		});
	} else {
		await browser.close();
		process.exit(0);
	}
}

function pubDate(date) {
	if (typeof date === 'undefined') {
		date = new Date();
	}

	var pieces = date.toString().split(' '),
		offsetTime = pieces[5].match(/[-+]\d{4}/),
		offset = offsetTime ? offsetTime : pieces[5],
		parts = [
			pieces[0] + ',',
			pieces[2],
			pieces[1],
			pieces[3],
			pieces[4],
			offset,
		];

	return parts.join(' ');
}
*/
