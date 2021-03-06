require('dotenv').config();
const rp = require('request-promise');
const _ = require('lodash');

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
			Authorization: `Bearer ${process.env.NUNCAMIND_XOXO_TOKEN}`,
		},
		method: 'GET',
		json: true,
		body: {},
	}).then(({ id }) => id);

const getFollowingById = (
	id,
	domain,
	url = `https://${domain}/api/v1/accounts/${id}/following`,
	followingUsernames = [],
) => {
	console.log('fetching', url);
	return rp({
		url,
		headers: {
			Authorization: `Bearer ${process.env.NUNCAMIND_XOXO_TOKEN}`,
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
				followingBody.map(
					({ acct }) => (acct.indexOf('@') >= 0 ? acct : `${acct}@${domain}`),
				),
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

const getMyFollowing = () =>
	getLoggedInUserId().then(id => getFollowingById(id, 'xoxo.zone'));

const getFollowingForAnotherUser = (
	username,
	domain,
	url = console.log(`Fetching followers for ${username}@${domain}`) ||
		`https://${domain}/users/${username}/following?page=1`,
	followingUris = [],
) =>
	rp({
		url,
		json: true,
	}).then(body => {
		// eslint-disable-next-line no-param-reassign
		followingUris = followingUris.concat(body.orderedItems);
		if (body.next) {
			console.log('...');
			return getFollowingForAnotherUser(
				username,
				domain,
				body.next,
				followingUris,
			);
		}
		return followingUris
			.map(uri => {
				if (!uri) return;
				const match = uri.match(/https?:\/\/(.*)\/users\/(.*)/);
				if (!match) {
					console.log('no match for', uri);
					return;
				}

				const followerDomain = match[1];
				const followerUsername = match[2];
				// eslint-disable-next-line consistent-return
				return `${followerUsername}@${followerDomain}`;
			})
			.filter(a => a);
	});

const followUsername = async username =>
	rp({
		url: `https://xoxo.zone/api/v1/follows`,
		headers: {
			Authorization: `Bearer ${process.env.NUNCAMIND_XOXO_TOKEN}`,
		},
		method: 'POST',
		json: true,
		body: {
			uri: username,
		},
	});

Promise.all([
	getMyFollowing(),
	getFollowingForAnotherUser('mrssoup', 'niu.moe'),
]).then(async ([myFollowing, theirFollowing]) => {
	const toFollow = _.difference(theirFollowing, myFollowing);
	console.log(`Trying to follow ${toFollow.length} folk(s)`);
	const failedFollows = [];
	const toFollowChunks = _.chunk(toFollow, 20);
	let i = 0;
	const len = toFollowChunks.length;
	while (i < len) {
		const chunk = toFollowChunks[i];
		console.log(`======================
Following batch ${i + 1} of ${len}`);
		// eslint-disable-next-line no-await-in-loop
		await Promise.all(
			// eslint-disable-next-line no-loop-func
			chunk.map(async username => {
				let success;
				console.log(`Following ${username}...`);
				try {
					// eslint-disable-next-line no-await-in-loop
					await followUsername(username);
					success = true;
				} catch (err) {
					console.log(`ERROR: Failed to follow ${username}`);
					failedFollows.push(username);
				}
				if (success) console.log(`Successfully followed ${username}`);
			}),
		);
		i += 1;
	}

	if (failedFollows.length) {
		console.log('Failed to follow these users: ', failedFollows);
	}
});
