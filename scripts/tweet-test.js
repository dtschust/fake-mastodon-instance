require('dotenv').config();
var Twit = require('twit');

var T = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token: process.env.TWITTER_ACCESS_TOKEN,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	strictSSL: true, // optional - requires SSL certificates to be valid.
});

//
//  tweet 'hello world!'
//
T.get(
	'statuses/user_timeline',
	{
		screen_name: 'trinandtonic',
		count: 10,
		include_rts: true,
		exclude_replies: false,
		tweet_mode: 'extended',
		trim_user: true,
	},
	function(err, data, response) {
		console.log(JSON.stringify(data[9]));
	},
);

// function fetchFollowers(prevFollowerIds = [], next_cursor) {
// 	console.log('fetching');
// 	return T.get('friends/list', {
// 		screen_name: 'nuncamind',
// 		count: 200,
// 		include_user_entities: false,
// 		cursor: next_cursor,
// 	}).then(response => {
// 		const followerIds = prevFollowerIds.concat(
// 			response.data.users.map(({ id }) => id),
// 		);
// 		console.log(response.data.users.length);
// 		if (response.data.next_cursor) {
// 			return fetchFollowers(followerIds, response.data.next_cursor);
// 		}

// 		return followerIds;
// 	});
// }

// fetchFollowers().then(followerIds => {
// 	console.log('done!');
// 	followerIds.forEach(id => {
// 		console.log(id);
// 	});
// });
