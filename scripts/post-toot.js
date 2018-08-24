const sendMessage = require('../src/send-message');

const user = 'nuncatest';
const now = Date.now();
const id = `post-${now}`;
const noteId = `toot-${now}`;
const message = {
	'@context': 'https://www.w3.org/ns/activitystreams',

	id: `https://fake-mastodon-instance.herokuapp.com/${id}`,
	type: 'Create',
	actor: `https://fake-mastodon-instance.herokuapp.com/users/${user}`,
	to: 'https://www.w3.org/ns/activitystreams#Public', // TODO figure out how to make these not public
	// "to": [ "https://mastodon.social/users/nuncatest" ], // TODO figure out how to make these not public
	// "to": [ `https://fake-mastodon-instance.herokuapp.com/users/${user}/followers` ], // TODO figure out how to make these not public

	object: {
		id: `https://fake-mastodon-instance.herokuapp.com/${noteId}`,
		type: 'Note',
		published: `${new Date().toISOString()}`,
		attributedTo: `https://fake-mastodon-instance.herokuapp.com/users/${user}`,
		content:
			'<p>another test post to <a href="https://fake-mastodon-instance.herokuapp.com/@dril" class="u-url mention">@dril@twitter.com</a></p>',
		tag: [
			{
				type: 'Mention',
				href: 'https://fake-mastodon-instance.herokuapp.com/users/dril',
				name: '@dril@fake-mastodon-instance.herokuapp.com',
			},
		],
		to: 'https://www.w3.org/ns/activitystreams#Public', // TODO figure out how to make these not public
		// "to": [ "https://mastodon.social/users/nuncatest" ], // TODO figure out how to make these not public
		// "to": [ `https://fake-mastodon-instance.herokuapp.com/users/${user}/followers` ], // TODO figure out how to make these not public
	},
};

sendMessage(message, user, 'mastodon.social');
