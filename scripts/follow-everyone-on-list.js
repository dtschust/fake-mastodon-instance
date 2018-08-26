require('dotenv').config();
const Twit = require('twit');
// eslint-disable-next-line import/no-extraneous-dependencies
const request = require('request');

const T = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token: process.env.TWITTER_ACCESS_TOKEN,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	strictSSL: true, // optional - requires SSL certificates to be valid.
});

T.get('lists/members', { list_id: '14507192', count: 5000 }).then(response => {
	// eslint-disable-next-line camelcase
	const usernames = response.data.users.map(({ screen_name }) => screen_name);
	const promises = usernames.map(
		username =>
			new Promise((resolve, reject) => {
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
			}),
	);

	Promise.all(promises).then(() => {
		console.log('done!');
	});
});
