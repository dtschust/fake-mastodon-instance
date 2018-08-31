require('dotenv').config();
const Twit = require('twit');
const request = require('request');

const T = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token: process.env.TWITTER_ACCESS_TOKEN,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	strictSSL: true, // optional - requires SSL certificates to be valid.
});

const getAlreadyFollowing = new Promise((resolve, reject) => {
	request(
		{
			url: `https://mastodon.social/api/v1/accounts/verify_credentials`,
			headers: {
				Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
			},
			method: 'GET',
			json: true,
			body: {},
		},
		(error, nothing, { id }) => {
			if (error) {
				console.log(`ERROR`, error);
				reject();
			} else {
				request(
					{
						url: `https://mastodon.social/api/v1/accounts/${id}/following`,
						headers: {
							Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
						},
						method: 'GET',
						json: true,
						body: {
							limit: 80,
						},
					},
					(err, mastodonResponse, followingBody) => {
						if (error) {
							console.log(`ERROR`);
							reject();
						} else {
							if (followingBody.length === 80) {
								// TODO support more than 80 following by refetching
								throw new Error('Cannot trust this list, it is incomplete!');
							}

							const alreadyFollowing = followingBody
								.filter(
									({ acct }) =>
										acct.split('@')[1] ===
										'fake-mastodon-instance.herokuapp.com',
								)
								.map(({ username }) => username.toLowerCase());
							resolve(alreadyFollowing);
						}
					},
				);
			}
		},
	);
});

const getTwitterListMembers = T.get('lists/members', {
	list_id: '14507192',
	count: 5000,
});

Promise.all([getAlreadyFollowing, getTwitterListMembers]).then(
	([alreadyFollowing, response]) => {
		// eslint-disable-next-line camelcase
		const usernames = response.data.users.map(({ screen_name }) => screen_name);
		const promises = usernames.map(username => {
			if (alreadyFollowing.indexOf(username.toLowerCase()) !== -1) {
				// console.log(`skipping ${username} because we already follow them`);
				return Promise.resolve();
			}
			return new Promise((resolve, reject) => {
				request(
					{
						url: `https://mastodon.social/api/v1/follows`,
						headers: {
							Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
						},
						method: 'POST',
						json: true,
						body: {
							uri: `${username}@fake-mastodon-instance.herokuapp.com`,
						},
					},
					(error, mastodonResponse, body) => {
						if (error) {
							console.log(`ERROR: COULD NOT FOLLOW ${username}!`);
							reject(error);
						} else {
							console.log(`Successfully followed ${username}!`);
							resolve(body);
						}
					},
				);
			});
		});

		Promise.all(promises).then(() => {
			console.log('done!');
		});
	},
);
