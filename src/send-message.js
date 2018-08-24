require('dotenv').config();
const request = require('request');
const crypto = require('crypto');

const domain = process.env.DOMAIN;
const cert = process.env.INSTANCE_PRIVATE_KEY;

module.exports = function sendMessage(message, name, destinationDomain, cb) {
	const signer = crypto.createSign('sha256');
	let d = new Date();
	let stringToSign = `(request-target): post /inbox\nhost: ${destinationDomain}\ndate: ${d.toUTCString()}`; // TODO hardcoded host
	signer.update(stringToSign);
	signer.end;
	const signature = signer.sign(cert);
	const signature_b64 = signature.toString('base64');
	let header = `keyId="${domain}/users/${name}",headers="(request-target) host date",signature="${signature_b64}"`;

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
			function(error, response, body) {
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
