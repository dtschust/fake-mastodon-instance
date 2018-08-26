require('dotenv').config();

module.exports = function getUserJson(username, twitterProfile) {
	const data = twitterProfile;
	const domain = process.env.DOMAIN;
	const userJson = {
		'@context': [
			'https://www.w3.org/ns/activitystreams',
			'https://w3id.org/security/v1',
			{
				manuallyApprovesFollowers: 'as:manuallyApprovesFollowers',
				sensitive: 'as:sensitive',
				movedTo: { '@id': 'as:movedTo', '@type': '@id' },
				Hashtag: 'as:Hashtag',
				ostatus: 'http://ostatus.org#',
				atomUri: 'ostatus:atomUri',
				inReplyToAtomUri: 'ostatus:inReplyToAtomUri',
				conversation: 'ostatus:conversation',
				toot: 'http://joinmastodon.org/ns#',
				Emoji: 'toot:Emoji',
				focalPoint: { '@container': '@list', '@id': 'toot:focalPoint' },
				featured: { '@id': 'toot:featured', '@type': '@id' },
				schema: 'http://schema.org#',
				PropertyValue: 'schema:PropertyValue',
				value: 'schema:value',
			},
		],
		id: `${domain}/users/${username}`,
		type: 'Person',
		following: `${domain}/users/${username}/following`,
		followers: `${domain}/users/${username}/followers`,
		preferredUsername: username,
		name: `🐧 ${data.name}`,
		summary: `${
			data.description
		} (this is a fake account, acting as a bridge to a real twitter account. You cannot follow it, only the developer can)`,
		url: `${domain}/@${username}`,
		manuallyApprovesFollowers: true,
		image: [{ url: `${data.profile_banner_url}`, type: 'Image' }],
		inbox: `${domain}/inbox`,
		icon: [
			{
				url: `${data.profile_image_url.replace('_normal', '_400x400')}`,
				type: 'Image',
			},
		],
		publicKey: {
			id: `${domain}/users/${username}#main-key`,
			owner: `${domain}/users/${username}`,
			publicKeyPem: process.env.INSTANCE_PUBLIC_KEY,
		},
		attachment: [
			{
				type: 'PropertyValue',
				name: 'what?',
				value:
					'this is a fake account, acting as a bridge to a real twitter account. You cannot follow it, only the developer can',
			},
		],
	};
	return userJson;
};
