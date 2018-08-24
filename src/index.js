require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Twit = require('twit');
const sendMessage = require('./send-message');

const T = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token: process.env.TWITTER_ACCESS_TOKEN,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	strictSSL: true, // optional - requires SSL certificates to be valid.
});

const app = express();

const domain = process.env.DOMAIN;

const key = process.env.INSTANCE_PUBLIC_KEY;
const cert = process.env.INSTANCE_PRIVATE_KEY;

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
	console.log('got an inbox post!', req.body);
	// TODO: verify signature or whatever.

	// Ignore anything that doesn't come from my account, hardcoded for now
	if (req.body.actor !== 'https://mastodon.social/users/nuncatest') {
		res.status(202).end();
		return;
	}

	console.log('HEADERS:', req.headers);
	// TODO: validate signature I guess
	if (req.body.type === 'Follow') {
		let userToAdd = req.body.object.split('/');
		userToAdd = userToAdd[userToAdd.length - 1];
		console.log('wants to follow', userToAdd);
		const id = Date.now();
		const message = {
			'@context': 'https://www.w3.org/ns/activitystreams',
			id: `${domain}/users/${userToAdd}#accepts/follows/${id}`,
			type: 'Accept',
			actor: req.body.object,
			object: {
				id: req.body.id,
				type: req.body.type,
				actor: req.body.actor,
				object: req.body.object,
			},
		};
		sendMessage(
			message,
			userToAdd,
			'mastodon.social',
			(error, response, body) => {
				// TODO dynamic domain
				res.status(202).end();
			},
		);

		// TODO: Add this user to the list of followers, update the database.
		// TODO: Maybe manually trigger a crawl of this user instead of waiting for the crawler

		// TODO: support unfollows
		// I don't need to send an accept I don't think, since I didn't get one when I did an unfollow.
		// I just need to unfollow the person
	}
});

app.get('/status/:user/:id', (req, res) => {
	res.redirect(
		301,
		`https://twitter.com/${req.params.user}/status/${req.params.id}`,
	);
});

app.get('/users/:username', (req, res) => {
	// TODO: cache these profiles.
	// TODO: figure out how to invalidate caches for profiles as well, the other instances have their own caches
	const username = req.params.username;
	console.log(
		req.path,
		`username ${req.params.username} requested!`,
		req.query,
		req.body,
	);
	T.get('users/lookup', { screen_name: username })
		.then(result => {
			const data = result.data[0];
			res.json({
				preferredUsername: username,
				name: `${data.name}`,
				summary: `${data.description}`,
				url: `${domain}/@${username}`,
				image: [
					{
						url: `${data.profile_banner_url}`,
						type: 'Image',
					},
				],
				inbox: `${domain}/inbox`,
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Person',
				id: `${domain}/users/${username}`,
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
			});
		})
		.catch(e => {
			console.log('Error', e);
			res.status(500).end();
		});
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
