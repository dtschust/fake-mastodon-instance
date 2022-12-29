require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const getUserJson = require('./get-user-json');

const app = express();

const domain = 'https://fake-mastodon-instance.herokuapp.com'

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


app.get('/users/:username', (req, res) => {
	const { username } = req.params;
	console.log(
		req.path,
		`username ${req.params.username} requested!`,
		req.query,
		req.body,
	);
	res.json(getUserJson(username));
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
