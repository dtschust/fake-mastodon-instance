require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Twit = require('twit')

const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms: 60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL: true,     // optional - requires SSL certificates to be valid.
});


const app = express();

const domain = process.env.DOMAIN;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// app.get('/.well-known/host-meta', (req, res) => {
// 	const xml = `<?xml version='1.0' encoding='UTF-8'?>
// <XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>
//   <Link rel='lrdd' type='application/json'
//         template='https://bridgy-federated.appspot.com/.well-known/webfinger?resource={uri}' />
// </XRD>`;
// 	res.status(200);
// 	res.type('application/xml');
// 	res.send(xml);
// });

app.get('/users/:username', (req,res) => {
	// TODO: cache these profiles.
	// TODO: figure out how to invalidate caches for profiles as well, the other instances have their own caches
	const username = req.params.username;
	console.log(req.path, `username ${req.params.username} requested!`, req.query, req.body);
	T.get('users/lookup', { screen_name: username }).then((result) => {
		const data = result.data[0];
		res.json({
			"preferredUsername": username,
			"name": `${data.name}`,
			"summary": `${data.description}`,
			"url": `${domain}/@${username}`,
			"image": [
				{
					"url": `${data.profile_banner_url}`,
					"type": "Image"
				}
			],
			"inbox": `${domain}/users/${username}/inbox`,
			"@context": "https://www.w3.org/ns/activitystreams",
			"type": "Person",
			"id": `${domain}/users/${username}`,
			"icon": [
				{
					"url": `${data.profile_image_url.replace('_normal', '_400x400')}`,
					"type": "Image"
				}
			]
		});
	}).catch((e) => {
		console.log('Error', e);
		res.status(500).end();
	});
})

app.get('/.well-known/webfinger', (req, res) => {
	const account = req.query.resource.slice(5);
	const username = account.split('@')[0];
	if (domain.indexOf(account.split('@')[1]) === -1) {
		res.status(404).end();
		return;
	}
	res.json(
		{
			"subject": req.query.resource,
			"aliases": [
				`${domain}/@${username}`,
				`${domain}/users/${username}`
			],
			"links": [
				{
					"rel": "http://webfinger.net/rel/profile-page",
					"type": "text/html",
					"href": `twitter.com/@${username}`
				},
				// {
				// 	"rel": "http://schemas.google.com/g/2010#updates-from",
				// 	"type": "application/atom+xml",
				// 	"href": `${domain}/users/${username}.atom`
				// },
				{
					"rel": "self",
					"type": "application/activity+json",
					"href": `${domain}/users/${username}`
				},
				// {
				// 	"rel": "salmon",
				// 	"href": `${domain}/api/salmon/37322` // TODO get an id?
				// },
				{
					"rel": "magic-public-key", // TODO get a real public keye
					"href": "data:application/magic-public-key,RSA.ouYy9P4LLbEzzCNCtevEIcFbobS3USLNIRSUawGe2wuWLI8CPuRfN5Fz4ZTPfWytqwFDbF5ff4zkteizolNKJEMmMT1TD1K8SZk1lp0hvpuDK-vp8XioxVXHkyaN4JxbMRQqG62kozvB5LQvFvomMQRgQTSSjvYb7VMWbF5m6y0=.AQAB",
				},
				// {
				// 	"rel": "http://ostatus.org/schema/1.0/subscribe",
				// 	"template": `${domain}/authorize_follow?acct={uri}`
				// }
			]
		}
	);

});
app.get('*', (req, res) => {
	console.log('got a request!', req.path, req.query, req.body);
	res.status(200).end();
});

app.listen(process.env.PORT || 3000);