require('dotenv').config();
const request = require('request');
const crypto = require('crypto');

// const message = require('./follow-request.json');
// Reply
const message = require('./reply.json');
message.id += Date.now();
message.object.id += Date.now();
message.object.content = `<p> Test Reply ${Date.now()} </p>`;
message.object.published = new Date().toISOString();


const domain = 'https://fake-mastodon-instance.herokuapp.com'
const privkey = process.env.INSTANCE_PRIVATE_KEY;
const username = 'nuncamind';
const theirDomain = 'mastodon.social';

console.log(message);

const signer = crypto.createSign('sha256');
let d = new Date();
let stringToSign = `(request-target): post /inbox\nhost: ${theirDomain}\ndate: ${d.toUTCString()}`; // TODO hardcoded host
signer.update(stringToSign);
signer.end;
const signature = signer.sign(privkey);
const signature_b64 = signature.toString('base64')
let header = `keyId="${domain}/users/${username}",headers="(request-target) host date",signature="${signature_b64}"`;

console.log('signature:', header);
request({
	url: `https://${theirDomain}/inbox`,
	headers: {
		'Host': theirDomain,
		'Date': d.toUTCString(),
		'Signature': header
	},
	method: 'POST',
	json: true,
	body: message
}, function (error, response, body) {
	console.log('Response: ', error, response.body, response.statusCode);
});