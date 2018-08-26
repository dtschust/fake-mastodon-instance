require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Twit = require('twit');
const mongoose = require('mongoose');
const useragent = require('useragent');
const sendMessage = require('./send-message');
const getUserJson = require('./get-user-json');

function isMobileSafari(ua) {
	try {
		return useragent.parse(ua).family.indexOf('Mobile Safari') !== -1;
	} catch (e) {
		// whatever, do nothing
		return false;
	}
}

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

function addNewFollowerToList(username) {
	// store the new user to follow, if we aren't already storing them!
	FollowingUsernameModel.findOne({ username }, (err, response) => {
		if (err) {
			console.log(`Error querying the database for ${username}`);
			return;
		}
		if (response) {
			// Nothing to do, we're already following this person.
			return;
		}

		const newFollowingUsername = new FollowingUsernameModel({
			username,
		});

		newFollowingUsername.save(saveErr => {
			if (saveErr) {
				console.log('Error saving to database', saveErr);
			}
			console.log(`done! Now following ${username}!`);
		});
	});
}

function removeFollowerFromList(username) {
	// store the new user to follow, if we aren't already storing them!
	FollowingUsernameModel.deleteOne({ username }, err => {
		if (err) {
			console.log(`Error deleting ${username}`);
			return;
		}
		console.log(`Success! Unfollowed ${username}`);
	});
}

const app = express();

const domain = process.env.DOMAIN;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
	express.json({
		type: [
			'application/json',
			'application/activity+json',
			'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
		],
	}),
);

app.post('/inbox', (req, res) => {
	if (req.body.type === 'Delete') {
		res.status(202).end();
	}
	console.log(
		`got an inbox post of type ${req.body.type}${
			req.body.object && req.body.object.type
				? ` subtype ${req.body.object.type}`
				: ''
		}!
`,
		JSON.stringify(req.body),
	);
	// TODO: validate signature I guess

	console.log('HEADERS:', req.headers);
	if (req.body.type === 'Follow') {
		let userToAdd = req.body.object.split('/');
		userToAdd = userToAdd[userToAdd.length - 1];
		console.log('wants to follow', userToAdd);
		const shouldAccept =
			req.body.actor === 'https://mastodon.social/users/nuncatest';
		const id = Date.now();
		const message = {
			'@context': 'https://www.w3.org/ns/activitystreams',
			id: `${domain}/users/${userToAdd}#acceptsOrRejects/follows/${id}${Date.now()}`,
			type: shouldAccept ? 'Accept' : 'Reject',
			actor: req.body.object,
			object: {
				id: req.body.id,
				type: req.body.type,
				actor: req.body.actor,
				object: req.body.object,
			},
		};
		sendMessage(message, userToAdd, 'mastodon.social', () => {
			// TODO dynamic domain
			res.status(202).end();
		});

		if (shouldAccept) {
			addNewFollowerToList(userToAdd);
		}
		// TODO: Maybe manually trigger a crawl of this user instead of waiting for the crawler
	} else if (
		req.body.type === 'Undo' &&
		req.body.object &&
		req.body.object.type === 'Follow' &&
		// Ignore anything that doesn't come from my account, hardcoded for now
		req.body.actor === 'https://mastodon.social/users/nuncatest'
	) {
		let userToRemove = req.body.object.object.split('/');
		userToRemove = userToRemove[userToRemove.length - 1];
		console.log(`Request received to unfollow ${userToRemove}`);
		removeFollowerFromList(userToRemove);
	}

	// Ignore anything that doesn't come from my account, hardcoded for now
	if (req.body.actor !== 'https://mastodon.social/users/nuncatest') {
		res.status(202).end();
	}
});

app.get('/status/:user/:id', (req, res) => {
	if (isMobileSafari(req.headers['user-agent'])) {
		res.redirect(301, `tweetbot://${req.params.user}/status/${req.params.id}`);
	} else {
		res.redirect(
			301,
			`https://twitter.com/${req.params.user}/status/${req.params.id}`,
		);
	}
});

app.get('/@:user', (req, res) => {
	if (isMobileSafari(req.headers['user-agent'])) {
		res.redirect(
			301,
			`tweetbot://${req.params.user}/user_profile/${req.params.user}`,
		);
	} else {
		res.redirect(301, `https://twitter.com/${req.params.user}`);
	}
});

app.get('/users/:username', (req, res) => {
	// TODO: cache these profiles.
	const { username } = req.params;
	console.log(
		req.path,
		`username ${req.params.username} requested!`,
		req.query,
		req.body,
	);
	T.get('users/lookup', { screen_name: username })
		.then(result => {
			const twitterProfile = result.data[0];
			res.json(getUserJson(username, twitterProfile));
		})
		.catch(e => {
			console.log('Error', e);
			res.status(500).end();
		});
});

app.get('/users/:username/followers', (req, res) => {
	// TODO: cache these profiles.
	const { username } = req.params;
	console.log(
		req.path,
		`username ${req.params.username} following requested!`,
		req.query,
		req.body,
	);
	if (!req.query.page) {
		res.json({
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
			id: `https://${domain}/users/${username}/followers`,
			type: 'OrderedCollection',
			totalItems: 1,
			first: `https://${domain}/users/${username}/followers?page=1`,
		});
	} else if (req.query.page === '1') {
		res.json({
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
			id: `${domain}/users/${username}/followers?page=1`,
			type: 'OrderedCollectionPage',
			totalItems: 1,
			partOf: `${domain}/users/${username}/followers`,
			orderedItems: [
				'https://mastodon.social/users/nuncatest', // TODO: this is hardcoded
			],
		});
	} else {
		res.json({
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
			id: `${domain}/users/${username}/followers?page=${req.query.page}`,
			type: 'OrderedCollectionPage',
			totalItems: 1,
			partOf: `${domain}/users/${username}/followers`,
			orderedItems: [],
		});
	}
});

app.get('/users/:username/following', (req, res) => {
	// TODO: cache these profiles.
	const { username } = req.params;
	console.log(
		req.path,
		`username ${req.params.username} followers requested!`,
		req.query,
		req.body,
	);
	if (!req.query.page) {
		res.json({
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
			id: `${domain}/users/${username}/following`,
			type: 'OrderedCollection',
			totalItems: 1,
			first: `${domain}/users/${username}/following?page=1`,
		});
	} else if (req.query.page === '1') {
		res.json({
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
			id: `${domain}/users/${username}/following?page=1`,
			type: 'OrderedCollectionPage',
			totalItems: 1,
			partOf: `${domain}/users/${username}/following`,
			orderedItems: [
				'https://mastodon.social/users/nuncatest', // TODO: this is hardcoded
			],
		});
	} else {
		res.json({
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
			id: `${domain}/users/${username}/following?page=${req.query.page}`,
			type: 'OrderedCollectionPage',
			totalItems: 1,
			partOf: `${domain}/users/${username}/following`,
			orderedItems: [],
		});
	}
});

app.get('/.well-known/webfinger', (req, res) => {
	const account = req.query.resource.slice(5);
	const username = account.split('@')[0];
	if (domain.indexOf(account.split('@')[1]) === -1) {
		res.status(404).end();
		return;
	}
	res.json({
		subject: req.query.resource,
		aliases: [`${domain}/@${username}`, `${domain}/users/${username}`],
		links: [
			{
				rel: 'http://webfinger.net/rel/profile-page',
				type: 'text/html',
				href: `twitter.com/@${username}`,
			},
			{
				rel: 'self',
				type: 'application/activity+json',
				href: `${domain}/users/${username}`,
			},
		],
	});
});
app.get('*', (req, res) => {
	console.log('got a request!', req.path, req.query, req.body);
	res.status(202).end();
});

app.listen(process.env.PORT || 3000);
