const twitter = require('twitter-text');

const tweettxt =
	'@BalloonAF lmao this is all I need to roast you😂 look like a damn chipmunk gtfo my mentions😂 http://t.co/YKvfV1z3Z8';
const entities = {
	hashtags: [],
	symbols: [],
	urls: [],
	user_mentions: [
		{
			screen_name: 'BalloonAF',
			name: 'mew.',
			id: 1097391858,
			id_str: '1097391858',
			indices: [0, 10],
			screenName: 'BalloonAF',
		},
	],
	media: [
		{
			id: 461969629477220350,
			id_str: '461969629477220352',
			indices: [97, 119],
			media_url: 'http://pbs.twimg.com/media/Bmk-7i4CMAALr8X.jpg',
			media_url_https: 'https://pbs.twimg.com/media/Bmk-7i4CMAALr8X.jpg',
			url: 'http://t.co/YKvfV1z3Z8',
			display_url: 'pic.twitter.com/YKvfV1z3Z8',
			expanded_url:
				'http://twitter.com/PhD_KoleKat/status/461969656568246272/photo/1',
			type: 'photo',
			sizes: {
				thumb: {
					w: 150,
					h: 150,
					resize: 'crop',
				},
				small: {
					w: 340,
					h: 453,
					resize: 'fit',
				},
				medium: {
					w: 480,
					h: 640,
					resize: 'fit',
				},
				large: {
					w: 480,
					h: 640,
					resize: 'fit',
				},
			},
		},
	],
};

const quoteTweet = {
	created_at: 'Sat Sep 08 21:10:56 +0000 2018',
	id: 1038535180519071700,
	id_str: '1038535180519071744',
	full_text: 'um who the fuck are you again https://t.co/bH0lDRIpQT',
	truncated: false,
	display_text_range: [0, 29],
	entities: {
		hashtags: [],
		symbols: [],
		user_mentions: [],
		urls: [
			{
				url: 'https://t.co/bH0lDRIpQT',
				expanded_url:
					'https://twitter.com/McAllisterDen/status/1037678444967079937',
				display_url: 'twitter.com/McAllisterDen/…',
				indices: [30, 53],
			},
		],
	},
	source:
		'<a href="http://tapbots.com/tweetbot" rel="nofollow">Tweetbot for iΟS</a>',
	in_reply_to_status_id: null,
	in_reply_to_status_id_str: null,
	in_reply_to_user_id: null,
	in_reply_to_user_id_str: null,
	in_reply_to_screen_name: null,
	user: { id: 14284788, id_str: '14284788' },
	geo: null,
	coordinates: null,
	place: {
		id: '4ed9d23c497a383d',
		url: 'https://api.twitter.com/1.1/geo/id/4ed9d23c497a383d.json',
		place_type: 'neighborhood',
		name: 'Lloyd Dist',
		full_name: 'Lloyd Dist, Portland',
		country_code: 'US',
		country: 'United States',
		contained_within: [],
		bounding_box: {
			type: 'Polygon',
			coordinates: [
				[
					[-122.674272, 45.525556],
					[-122.649437, 45.525556],
					[-122.649437, 45.535105],
					[-122.674272, 45.535105],
				],
			],
		},
		attributes: {},
	},
	contributors: null,
	is_quote_status: true,
	quoted_status_id: 1037678444967080000,
	quoted_status_id_str: '1037678444967079937',
	quoted_status_permalink: {
		url: 'https://t.co/bH0lDRIpQT',
		expanded: 'https://twitter.com/McAllisterDen/status/1037678444967079937',
		display: 'twitter.com/McAllisterDen/…',
	},
	quoted_status: {
		created_at: 'Thu Sep 06 12:26:35 +0000 2018',
		id: 1037678444967080000,
		id_str: '1037678444967079937',
		full_text:
			'At the root of #abortion hysteria is women’s unhinged desire for irresponsible sex. Sex is their god. Abortion is their sacrament. It’s abhorrent as women have flung themselves from the heights of being the world’s civilizing force to the muck and mire of dehumanizing depravity.',
		truncated: false,
		display_text_range: [0, 279],
		entities: {
			hashtags: [{ text: 'abortion', indices: [15, 24] }],
			symbols: [],
			user_mentions: [],
			urls: [],
		},
		source:
			'<a href="http://twitter.com/download/iphone" rel="nofollow">Twitter for iPhone</a>',
		in_reply_to_status_id: null,
		in_reply_to_status_id_str: null,
		in_reply_to_user_id: null,
		in_reply_to_user_id_str: null,
		in_reply_to_screen_name: null,
		user: { id: 498459134, id_str: '498459134' },
		geo: null,
		coordinates: null,
		place: null,
		contributors: null,
		is_quote_status: false,
		retweet_count: 165,
		favorite_count: 450,
		favorited: false,
		retweeted: false,
		lang: 'en',
	},
	retweet_count: 0,
	favorite_count: 0,
	favorited: false,
	retweeted: false,
	possibly_sensitive: false,
	lang: 'en',
};

let text = twitter.autoLinkWithJSON(
	quoteTweet.quoted_status.full_text,
	quoteTweet.quoted_status.entities,
);

if (entities.user_mentions && entities.user_mentions.length) {
	entities.user_mentions.forEach(({ screenName }) => {
		text = text.replace(
			new RegExp(
				`@<a class="tweet-url username" href="https://twitter.com/${screenName}" data-screen-name="${screenName}" rel="nofollow">${screenName}</a>`,
				'g',
			),
			`<a href="https://xoxo.zone/@br" class="u-url mention">@${screenName}@twitter.com</a>`,
		);
	});
}

console.log(text);
