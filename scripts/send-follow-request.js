require('dotenv').config();

// eslint-disable-next-line import/no-extraneous-dependencies
const request = require('request');
const crypto = require('crypto');

const message = require('./follow-request.json');

message.id += Date.now();

const domain = 'https://fake-mastodon-instance.herokuapp.com';
const privkey = process.env.INSTANCE_PRIVATE_KEY;
const username = 'dril';
const theirDomain = 'mastodon.social';

console.log(privkey);
console.log(message);

const signer = crypto.createSign('sha256');
const d = new Date();
const stringToSign = `(request-target): post /inbox\nhost: ${theirDomain}\ndate: ${d.toUTCString()}`; // TODO hardcoded host
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
