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

const actorWhiteList = [
	'https://mastodon.social/users/nuncatest',
	'https://xoxo.zone/users/nuncamind',
];

const isActorInWhiteList = actor => actorWhiteList.indexOf(actor) !== -1;

const FollowingUsernameModel = mongoose.model('FollowingUsername', {
	username: String,
});

const FollowingEventModel = mongoose.model('FollowingEventModel', {
	timestamp: Number,
	id: String,
});

const UnfollowingEventModel = mongoose.model('UnfollowingEventModel', {
	timestamp: Number,
	id: String,
});

function addNewFollowerToList(username, followerEventId) {
	FollowingEventModel.findOne(
		{ id: followerEventId },
		(followerEventErr, followerEventResp) => {
			if (followerEventErr) {
				console.log(
					`Error querying the database for follower event id ${followerEventId}`,
				);
				return;
			}
			if (followerEventResp && followerEventId) {
				// Nothing to do, we've already acted on this follower event
				console.log('We have already handled this follow event, ignoring it');
				return;
			}

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
					if (followerEventId) {
						new FollowingEventModel({
							timestamp: Date.now(),
							id: followerEventId,
						}).save(followingEventSaveErr => {
							if (followingEventSaveErr) {
								console.log(
									'Error saving to following events database',
									followingEventSaveErr,
								);
							}
						});
					}
				});
			});
		},
	);
}

function removeFollowerFromList(username, removeFollowerEventId) {
	UnfollowingEventModel.findOne(
		{ id: removeFollowerEventId },
		(removeFollowerEventErr, removeFollowerEventResp) => {
			if (removeFollowerEventErr) {
				console.log(
					`Error querying the database for follower event id ${removeFollowerEventId}`,
				);
				return;
			}
			if (removeFollowerEventResp && removeFollowerEventId) {
				// Nothing to do, we've already acted on this undo follower event
				console.log(
					'We have already handled this undo follow event, ignoring it',
				);
			}
			// store the new user to follow, if we aren't already storing them!
			FollowingUsernameModel.deleteOne({ username }, err => {
				if (err) {
					console.log(`Error deleting ${username}`);
					return;
				}
				console.log(`Success! Unfollowed ${username}`);
				if (removeFollowerEventId) {
					new UnfollowingEventModel({
						timestamp: Date.now(),
						id: removeFollowerEventId,
					}).save(followingEventSaveErr => {
						if (followingEventSaveErr) {
							console.log(
								'Error saving to following events database',
								followingEventSaveErr,
							);
						}
					});
				}
			});
		},
	);
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

app.use((req, res, next) => {
	// Don't allow user to hit Heroku now that we have a domain
	const host = req.get('Host');
	if (host === 'fake-mastodon-instance.herokuapp.com') {
		return res.redirect(301, `https://toot.rip/${req.originalUrl}`);
	}
	return next();
});

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

	console.log('HEADERS:', req.headers);
	if (req.body.type === 'Follow') {
		let userToAdd = req.body.object.split('/');
		userToAdd = userToAdd[userToAdd.length - 1];
		console.log('wants to follow', userToAdd);
		const shouldAccept = isActorInWhiteList(req.body.actor);
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

		const domainToRespondTo =
			req.body.actor.indexOf('mastodon.social') >= 0
				? 'mastodon.social'
				: 'xoxo.zone';
		sendMessage(message, userToAdd, domainToRespondTo, () => {
			res.status(202).end();
		});

		if (shouldAccept) {
			addNewFollowerToList(userToAdd, req.body.id);
		}
	} else if (
		req.body.type === 'Undo' &&
		req.body.object &&
		req.body.object.type === 'Follow' &&
		// Ignore anything that doesn't come from my account
		isActorInWhiteList(req.body.actor)
	) {
		let userToRemove = req.body.object.object.split('/');
		userToRemove = userToRemove[userToRemove.length - 1];
		console.log(`Request received to unfollow ${userToRemove}`);
		removeFollowerFromList(userToRemove, req.body.id);
	} else if (req.body.type === 'Like' && isActorInWhiteList(req.body.actor)) {
		const status = req.body.object.split('/').slice(-1);
		console.log(`User liked this status: ${status}`);
		T.post('favorites/create', { id: status, include_entities: false })
			.then(() => {
				console.log('Successfully liked the status on twitter');
			})
			.catch(() => {
				// Do nothing, because we get duplicate alerts for likes and it errors the second time
				// console.log('Error liking status', e);
			});
	} else if (
		req.body.type === 'Undo' &&
		req.body.object &&
		req.body.object.type === 'Like' &&
		isActorInWhiteList(req.body.actor)
	) {
		const status = req.body.object.object.split('/').slice(-1);
		console.log(`User unliked this status: ${status}`);
		T.post('favorites/destroy', { id: status, include_entities: false })
			.then(() => {
				console.log('Successfully unliked the status on twitter');
			})
			.catch(() => {
				// Do nothing, because we get duplicate alerts for dislikes and it errors the second time
				// console.log('Error unliking status', e);
			});
	}

	// Ignore anything that doesn't come from my account, hardcoded for now
	if (!isActorInWhiteList(req.body.actor)) {
		res.status(202).end();
	}
	res.status(202).end();
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
			totalItems: 420,
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
			totalItems: 420,
			partOf: `${domain}/users/${username}/followers`,
			orderedItems: actorWhiteList,
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
			totalItems: 420,
			partOf: `${domain}/users/${username}/followers`,
			orderedItems: [],
		});
	}
});

app.get('/users/:username/following', (req, res) => {
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
			totalItems: 420,
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
			totalItems: 420,
			partOf: `${domain}/users/${username}/following`,
			orderedItems: actorWhiteList,
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
			totalItems: 420,
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
