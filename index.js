// TODO: prettier
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Twit = require('twit');
const https = require('https');
const httpSignature = require('http-signature');

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

const key = process.env.INSTANCE_PUBLIC_KEY;
const cert = process.env.INSTANCE_PRIVATE_KEY;

// TODO: Here's how to make a signed request I think
/*
var options = {
	host: 'localhost',
	port: 8443,
	path: '/',
	method: 'GET',
	headers: {}
};

// Adds a 'Date' header in, signs it, and adds the
// 'Authorization' header in.
var req = https.request(options, function (res) {
	console.log(res.statusCode);
});


httpSignature.sign(req, {
	key: key,
	keyId: './cert.pem'
});

req.end();
*/

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json({ type: ['application/json', 'application/activity+json', 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'] }))

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

app.post('/inbox', (req, res) => {
	console.log('got an inbox post!', req.body);
	/* looks like this:
	{ '@context':
[ 'https://www.w3.org/ns/activitystreams',
'https://w3id.org/security/v1',
{ manuallyApprovesFollowers: 'as:manuallyApprovesFollowers',
sensitive: 'as:sensitive',
movedTo: 'as:movedTo',
Hashtag: 'as:Hashtag',
ostatus: 'http://ostatus.org#',
atomUri: 'ostatus:atomUri',
inReplyToAtomUri: 'ostatus:inReplyToAtomUri',
conversation: 'ostatus:conversation',
toot: 'http://joinmastodon.org/ns#',
Emoji: 'toot:Emoji',
focalPoint: [Object],
featured: 'toot:featured',
schema: 'http://schema.org#',
PropertyValue: 'schema:PropertyValue',
value: 'schema:value' } ],
id: 'https://xoxo.zone/bafe132d-a7c0-4a4b-8096-3abeca56011a',
type: 'Follow',
actor: 'https://xoxo.zone/users/nuncamind',
object: 'https://fake-mastodon-instance.herokuapp.com/users/burgerking',
signature:
{ type: 'RsaSignature2017',
creator: 'https://xoxo.zone/users/nuncamind#main-key',
created: '2018-08-22T20:46:14Z',
signatureValue: 'Wh0v2QugV7OJV1ON4pKBD4yEtlMy6QSyx6ZBR9jesMz7sjbjsRznDlhnKcHe4/UZZ9iYJyCLaIfGzzsGPSGGmhTP04dd/ENj0KvdZACMB9bmIMMJMAqSXL8vALHMYsP+4jDnT5pKH3JVS+zs7k6fc6mvvxt2PrJdnLSfSTzE6ABU5WIX1Hc5PJsOepSUCILjO8PWoaNRF72WbkMZ8okb5MYL4niEyWaRfhZ/pkjZ5oLvH9oZ+Z1uoDXYK3O3tK8fcs3YbHzQaZd9ipSjWZ32wz34YdA/iKcUsuUmbDq5YTrWXXMxAOV229rKq8wdfhv49pdU7XTe7EXq+AoeGotiEA==' } }
	*/
	// TODO: verify signature or whatever.

	// Ignore anything that doesn't come from my account, hardcoded for now
	if (req.body.actor !== 'https://mastodon.social/users/nuncatest') {
		res.status(200).end();
		return;
	}

	console.log('HEADERS:', req.headers);
	// 'keyId="https://xoxo.zone/users/nuncamind#main-key",algorithm="rsa-sha256",headers="(request-target) user-agent host date accept-encoding digest content-type",signature="oTwNkVRCQhTC5aASK86qd8uZbKug1qr4SaMfPdWNQzX5cxD4gan+K49GyZXb2FLUQvf2KaxXCujsO3yIDlGnD3A87JgRJVsmvNFZU7ftchngaYEHGDS7402WHRXBReSZjwThCB2O2vaZT6wN5ojDSgVAS8NvjZWDmZNe8RPaDib0MuQC+6KSuOSfw6e7Rq/8caDAfarQ6p4JG1uj/05DtbguPKa6hmtVK2IrdJcXgbcJQ4ScIIhwwkAIKD0Sxw1hXceWVj6b82pvLEKjQr3ix7B6gwCSuaUwk7cuganzLFllDjoDHiQdmjlTd3gqOgppmtg2VTu0mg851cim9NsVDg=="'

	// const signatureHeader = req.headers.Signature.split(',');
	// const keyId = signatureHeader[0].split('=')[1].slice(1, -1);
	// const headers = signatureHeader[2].split('=')[1].slice(1, -1);
	// const signature = atob(signatureHeader[3].split('=')[1].slice(1, -1));
	// req.headers.signature = req.headers.authorization;
	// req.headers.signature = req.headers.signature.slice('Signature: '.length);
	// console.log('req.headers.signature', req.headers.signature);
	// var parsed = httpSignature.parseRequest(req);
	// // var pub = req.body.signatureValue;
	// if (!httpSignature.verifySignature(parsed, pub)) {
	// 	console.log('Invalid http signature I think!');
	// 	res.status(500).end();
	// 	return;
	// }

	if (req.body.type === 'Follow') {
		let userToAdd = req.body.object.split('/')
		userToAdd = userToAdd[userToAdd.length - 1];
		console.log('wants to follow', userToAdd);
		// TODO: send "Accept" type event. Find out how it's formatted by trying to follow and unfollow
		// TODO: Add this user to the list of followers, update the database.
		// TODO: Maybe manually trigger a crawl of this user instead of waiting for the crawler
	} else if (req.body.type === 'Unfollow') {
		let userToRemove = req.body.object.split('/')
		userToRemove = userToRemove[userToAdd.length - 1];
		console.log('wants to unfollow', userToRemove);
		// TODO: send "Accept" type event. Find out how it's formatted by trying to follow and unfollow
		// TODO: Remove this user from the list of followers, update the database.

	}
	res.status(500).end();
});

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
			"inbox": `${domain}/inbox`,
			"@context": "https://www.w3.org/ns/activitystreams",
			"type": "Person",
			"id": `${domain}/users/${username}`,
			"icon": [
				{
					"url": `${data.profile_image_url.replace('_normal', '_400x400')}`,
					"type": "Image"
				}
			],
			"publicKey": {
				"id": `${domain}/users/${username}#main-key`,
				"owner": `${domain}/users/${username}`,
				"publicKeyPem": process.env.INSTANCE_PUBLIC_KEY,
			},
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
					"rel": "magic-public-key", // TODO get a real public key
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