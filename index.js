require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const domain = process.env.DOMAIN;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/.well-known/host-meta', (req, res) => {
	const xml = `<?xml version='1.0' encoding='UTF-8'?>
<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>
  <Link rel='lrdd' type='application/json'
        template='https://bridgy-federated.appspot.com/.well-known/webfinger?resource={uri}' />
</XRD>`;
	res.status(200);
	res.type('application/xml');
	res.send(xml);
});

app.get('/users/:username', (req,res) => {
	const username = req.params.username;
	console.log(req.path, `username ${req.params.username} requested!`, req.query, req.body);
	res.json({
		"preferredUsername": username,
		"name": "Drew Schuster (hardcoded)",
		"url": `${domain}/@${username}`,
		"image": [
			{
				"url": "https://xoxo.zone/system/accounts/avatars/000/037/322/original/009fec3fcfa521f5.jpg",
				"type": "Image"
			}
		],
		// "publicKey": {
		// 	"publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDfEICazUKIiP+vAq4gu4DrRUyh\n6YR4xNBt9R3KSPCV3a+wi0uRZ1x+dV8+KLv2SHpBQ9Yn3V/1+uLpxa+beXD2b7ZT\nZ+oXw3iH8RteE2JXehIgvUUQQJZr/8jGVUkYYsliEB5X2Pk67puhA6tgjr5UK0tQ\n1ZvEKzcgeSrRRBDgRwIDAQAB\n-----END PUBLIC KEY-----"
		// },
		"inbox": `${domain}/users/${username}/inbox`,
		"@context": "https://www.w3.org/ns/activitystreams",
		"type": "Person",
		"id": `${domain}/users/${username}`,
		"icon": [
			{
				"url": "https://xoxo.zone/system/accounts/avatars/000/037/322/original/009fec3fcfa521f5.jpg",
				"type": "Image"
			}
		]
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
					"href": `${domain}/@${username}`
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
				{
					"rel": "salmon",
					"href": `${domain}/api/salmon/37322` // TODO get an id?
				},
				{
					"rel": "magic-public-key", // TODO get a real public keye
					"href": "data:application/magic-public-key,RSA.ouYy9P4LLbEzzCNCtevEIcFbobS3USLNIRSUawGe2wuWLI8CPuRfN5Fz4ZTPfWytqwFDbF5ff4zkteizolNKJEMmMT1TD1K8SZk1lp0hvpuDK-vp8XioxVXHkyaN4JxbMRQqG62kozvB5LQvFvomMQRgQTSSjvYb7VMWbF5m6y0=.AQAB",
				},
				{
					"rel": "http://ostatus.org/schema/1.0/subscribe",
					"template": `${domain}/authorize_follow?acct={uri}`
				}
			]
		}
	);

});
app.get('*', (req, res) => {
	console.log('got a request!', req.path, req.query, req.body);
	res.status(200).end();
});

app.listen(process.env.PORT || 3000);