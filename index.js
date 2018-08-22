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
				{
					"rel": "http://schemas.google.com/g/2010#updates-from",
					"type": "application/atom+xml",
					"href": `${domain}/users/${username}.atom`
				},
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