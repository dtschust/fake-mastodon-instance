require('dotenv').config();
// eslint-disable-next-line import/no-extraneous-dependencies
const request = require('request');
const crypto = require('crypto');

const domain = process.env.DOMAIN;
const cert = process.env.INSTANCE_PRIVATE_KEY;

module.exports = function sendMessage(message, name, destinationDomain, cb) {
	const signer = crypto.createSign('sha256');
	const d = new Date();
	const stringToSign = `(request-target): post /inbox\nhost: ${destinationDomain}\ndate: ${d.toUTCString()}`;
	signer.update(stringToSign);
	signer.end();
	const signature = signer.sign(cert);
	const signatureB64 = signature.toString('base64');
	const header = `keyId="${domain}/users/${name}",headers="(request-target) host date",signature="${signatureB64}"`;

	// console.log('signature:', header);
	// console.log('Sending message', message);
	return new Promise((resolve, reject) => {
		request(
			{
				url: `https://${destinationDomain}/inbox`,
				headers: {
					Host: destinationDomain,
					Date: d.toUTCString(),
					Signature: header,
				},
				method: 'POST',
				json: true,
				body: message,
			},
			(error, response, body) => {
				// console.log('Response: ', error, response.body, response.statusCode);
				if (error) {
					reject(error);
				} else {
					resolve(body);
				}
				if (cb) {
					cb(error, response, body);
				}
			},
		);
	});
};
