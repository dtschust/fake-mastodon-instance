require('dotenv').config();
const _ = require('lodash');
const Twit = require('twit');
const rp = require('request-promise');

const T = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token: process.env.TWITTER_ACCESS_TOKEN,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	strictSSL: true, // optional - requires SSL certificates to be valid.
});

const LIST_ID = 10;

function grabLinkHeader(body, response) {
	let retBody = body;
	if (response.headers['content-type'] === 'application/json') {
		retBody = JSON.parse(body);
	}
	if (response.headers.link) {
		if (response.headers.link.indexOf('rel="next"') >= 0) {
			const nextString = response.headers.link
				.split(',')
				.find(string => string.indexOf('rel="next"') >= 0);
			const nextUrl = nextString
				.match(/<.*>/)[0]
				.slice(1)
				.slice(0, -1);
			retBody.nextUrl = nextUrl;
		}
	}

	return retBody;
}

const getLoggedInUserId = () =>
	rp({
		url: 'https://xoxo.zone/api/v1/accounts/verify_credentials',
		headers: {
			Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
		},
		method: 'GET',
		json: true,
		body: {},
	}).then(({ id }) => id);

const getFollowingById = (
	id,
	domain,
	url = `https://${domain}/api/v1/accounts/${id}/following?limit=80`,
	followingUsernames = [],
) => {
	console.log('fetching', url);
	return rp({
		url,
		headers: {
			Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
		},
		method: 'GET',
		json: true,
		body: {
			limit: 80,
		},
		transform: grabLinkHeader,
	})
		.then(followingBody => {
			// eslint-disable-next-line no-param-reassign
			followingUsernames = followingUsernames.concat(
				followingBody.filter(({ acct }) => acct.split('@')[1] === 'toot.rip'),
			);
			if (followingBody.nextUrl) {
				return getFollowingById(
					id,
					domain,
					followingBody.nextUrl,
					followingUsernames,
				);
			}

			return followingUsernames;
		})
		.catch(err => {
			console.log(`ERROR`, err);
		});
};

let myFollowingPromise;

const getMyFollowing = () => {
	if (myFollowingPromise) return myFollowingPromise;
	myFollowingPromise = getLoggedInUserId().then(id =>
		getFollowingById(id, 'xoxo.zone'),
	);
	return myFollowingPromise;
};

const getTwitterListMembers = () =>
	T.get('lists/members', {
		list_id: '14507192',
		count: 5000,
	});

const updateMyList = async (additionalIds = []) => {
	const following = await getMyFollowing();
	const ids = following.map(({ id }) => id);
	const currentList = await rp({
		url: `https://xoxo.zone/api/v1/lists/${LIST_ID}/accounts?limit=0`,
		headers: {
			Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
		},
		method: 'GET',
		json: true,
	});
	const currentIds = currentList.map(({ id }) => id);
	const idsToAdd = _.difference(ids, currentIds).concat(additionalIds);
	if (idsToAdd.length) {
		await rp({
			url: `https://xoxo.zone/api/v1/lists/${LIST_ID}/accounts`,
			headers: {
				Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
			},
			method: 'POST',
			json: true,
			body: {
				account_ids: idsToAdd,
			},
		});
		console.log(`Done! Added ${idsToAdd.length} new members to the list`);
	} else {
		console.log('No one to add to the list!');
	}
};

Promise.all([getMyFollowing(), getTwitterListMembers()]).then(
	([following, response]) => {
		const alreadyFollowing = following.map(({ username }) =>
			username.toLowerCase(),
		);
		const domain = 'xoxo.zone';
		const usernames = response.data.users
			// eslint-disable-next-line camelcase
			.map(({ screen_name }) => screen_name)
			.filter(
				username => alreadyFollowing.indexOf(username.toLowerCase()) === -1,
			);
		console.log('to follow: ', usernames, usernames.length);
		const idsToAddToList = [];
		Promise.all(
			usernames.map(username =>
				rp({
					url: `https://${domain}/api/v1/follows`,
					headers: {
						Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
					},
					method: 'POST',
					json: true,
					body: {
						uri: `${username}@toot.rip`,
					},
				})
					.then(({ id }) => {
						idsToAddToList.push(id);
						console.log(`Successfully followed ${username}!`);
					})
					.catch(error => {
						console.log(`ERROR: COULD NOT FOLLOW ${username}!`);
						throw error;
					}),
			),
		).then(async () => {
			console.log('waiting five seconds before updating the list...');
			setTimeout(async () => {
				await updateMyList(idsToAddToList);
				console.log('done!');
			}, 5000);
		});
	},
);
