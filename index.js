require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const domain = process.env.DOMAIN;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/.well-known/webfinger', (req, res) => {
	const account = req.query.resource.slice(5);
	const username = account.split('@')[0];
	if (domain.indexOf(account.split('@')[1]) === -1) {
		res.status(404).end();
		return;
	}
	res.json(
		{
			"subject": req.query,
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
					"href": "data:application/magic-public-key,RSA.ylb7bBHJa_oOwsfP-fTxgYNA7mfTAFCtn8XDXxf-2TCWIT8uYEmEVMWzflXRzvBurB4h8Ap4dpe_6JyGGslXTaTW1AyPWdQ7MNF1wNg5vuE-YhvAXGwJFoMJx-pbZpAq-3pZCOnnSB_njRZ-V4ciPNLJvHu0V9kPtwaYssQhRXqOIxhje_tsNt6JMpki7bgWUy2eQIcas8M3nA6hlLPbsdlWIcOkdW7J4y2a-_xmBAoIMuWZz-rvQAAI5Dzk_V2SctH6TH9TN8q1lEg3YigFeXdGrQc8oIiMdQwzVipbK1BZTz9h3TmPW1uzH4slA2m_IwnKvjua_hceKN9n3ULfVw==.AQAB"
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