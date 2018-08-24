const twitter = require('twitter-text');

var tweettxt =
	'@BalloonAF lmao this is all I need to roast you😂 look like a damn chipmunk gtfo my mentions😂 http://t.co/YKvfV1z3Z8';
var entities = {
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

let text = twitter.autoLinkWithJSON(tweettxt, entities);

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
