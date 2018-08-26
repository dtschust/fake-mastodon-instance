require('dotenv').config();

// eslint-disable-next-line import/no-extraneous-dependencies
const request = require('request');
const crypto = require('crypto');

const domain = 'https://fake-mastodon-instance.herokuapp.com';
const privkey = process.env.INSTANCE_PRIVATE_KEY;
const username = 'speakerpaulryan';
const theirDomain = 'mastodon.social';

const message = {
	'@context': 'https://www.w3.org/ns/activitystreams',
	id: `https://fake-mastodon-instance.herokuapp.com/follow-requests/${Date.now()}`,
	type: 'Follow',
	actor: `${domain}/users/${username}`,
	object: 'https://mastodon.social/users/nuncatest',
};

console.log(message);

const signer = crypto.createSign('sha256');
const d = new Date();
const stringToSign = `(request-target): post /inbox\nhost: ${theirDomain}\ndate: ${d.toUTCString()}`;
signer.update(stringToSign);
signer.end(); // I think this is ok? it used to just be signer.end which would be a noop
const signature = signer.sign(privkey);
const signatureB64 = signature.toString('base64');
const header = `keyId="${domain}/users/${username}",headers="(request-target) host date",signature="${signatureB64}"`;

console.log('signature:', header);
request(
	{
		url: `https://${theirDomain}/inbox`,
		headers: {
			Host: theirDomain,
			Date: d.toUTCString(),
			Signature: header,
		},
		method: 'POST',
		json: true,
		body: message,
	},
	(error, response /* , body */) => {
		console.log('Response: ', error, response.body, response.statusCode);
	},
);
