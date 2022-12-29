require('dotenv').config();

const PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxy8/VOvVie2Pbn+j1Zq/\nWM6SaVjMNo7MYCH8qK+1olyM9OB4h3CBCVVfzBw5dpEmmUpDTX8kZdKfB7uz56CO\nRSwuzkSFdcDa3SYjOIxP5i9mlQXhY6nLFP0gBZSIFeeTohps+ccGnLza8wGt9kCo\nUkyqCY+AlFx2JRuoh00kUJx4dd+s3xtMSAphwCv0j4TiE1oogkpjcFCm6SX+cr8F\nIpCxCz1c5lUHGw48UWQy3bD3C41Ql1Sye+PaDeb99By6Qqjh7a/MWCk+1pEjD0nv\nZt8hZsd0FojW88AHApd9OiCOouBrX8JBsB/xw3+qtGBWUq2Ji1lj8qp7G7Und0Na\ndQIDAQAB\n-----END PUBLIC KEY-----\n'
module.exports = function getUserJson(username) {
	const domain = 'https://fake-mastodon-instance.herokuapp.com'
	const userJson = {
		"@context": [
			"https://www.w3.org/ns/activitystreams",
			"https://w3id.org/security/v1",
			{
				"manuallyApprovesFollowers": "as:manuallyApprovesFollowers",
				"toot": "http://joinmastodon.org/ns#",
				"featured": {
					"@id": "toot:featured",
					"@type": "@id"
				},
				"featuredTags": {
					"@id": "toot:featuredTags",
					"@type": "@id"
				},
				"alsoKnownAs": {
					"@id": "as:alsoKnownAs",
					"@type": "@id"
				},
				"movedTo": {
					"@id": "as:movedTo",
					"@type": "@id"
				},
				"schema": "http://schema.org#",
				"PropertyValue": "schema:PropertyValue",
				"value": "schema:value",
				"discoverable": "toot:discoverable",
				"Device": "toot:Device",
				"Ed25519Signature": "toot:Ed25519Signature",
				"Ed25519Key": "toot:Ed25519Key",
				"Curve25519Key": "toot:Curve25519Key",
				"EncryptedMessage": "toot:EncryptedMessage",
				"publicKeyBase64": "toot:publicKeyBase64",
				"deviceId": "toot:deviceId",
				"claim": {
					"@type": "@id",
					"@id": "toot:claim"
				},
				"fingerprintKey": {
					"@type": "@id",
					"@id": "toot:fingerprintKey"
				},
				"identityKey": {
					"@type": "@id",
					"@id": "toot:identityKey"
				},
				"devices": {
					"@type": "@id",
					"@id": "toot:devices"
				},
				"messageFranking": "toot:messageFranking",
				"messageType": "toot:messageType",
				"cipherText": "toot:cipherText",
				"suspended": "toot:suspended"
			}
		],
		id: `${domain}/users/${username}`,
		type: 'Person',
		following: `${domain}/users/${username}/following`,
		followers: `${domain}/users/${username}/followers`,
		preferredUsername: username,
		url: `${domain}/@${username}`,
		manuallyApprovesFollowers: false,
		inbox: `${domain}/users/${username}/inbox`,
		outbox: `${domain}/users/${username}/outbox`,
		featured: `${domain}/users/${username}/collections/featured`,
		tags: `${domain}/users/${username}/collections/tags`,
		"name": "",
		"summary": "",
		"discoverable": false,
		"published": "2018-08-24T00:00:00Z",
		"suspended": true,
		publicKey: {
			id: `${domain}/users/${username}#main-key`,
			owner: `${domain}/users/${username}`,
			publicKeyPem: PUBLIC_KEY,
		},
		"tag": [],
		"attachment": [],
		"endpoints": {
			"sharedInbox": `${domain}/inbox`
		}
	}
	return userJson;
};
