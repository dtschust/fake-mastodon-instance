const sendMessage = require('../src/send-message');

const user = 'nuncamind';
const now = Date.now();
const id = `post-${now}`;
const noteId = `toot-${now}`;
const message = {
	'@context': 'https://www.w3.org/ns/activitystreams',

	id: `https://fake-mastodon-instance.herokuapp.com/${id}`,
	type: 'Create',
	actor: `https://fake-mastodon-instance.herokuapp.com/users/${user}`,

	object: {
		id: `https://fake-mastodon-instance.herokuapp.com/${noteId}`,
		type: 'Note',
		published: `${new Date().toISOString()}`,
		attributedTo: `https://fake-mastodon-instance.herokuapp.com/users/${user}`,
		content: '<p>This is a followers only message</p>',
		tag: [],
		// to: 'https://www.w3.org/ns/activitystreams#Public', // public
		// Below should send DMs, doesn't work but I don't really care. For DM to work it needs to mention the user, and have a tag with a mention in it
		// to: ['https://mastodon.social/users/nuncatest'],
		to: [
			`https://fake-mastodon-instance.herokuapp.com/users/${user}/followers`,
		],
	},
};

sendMessage(message, user, 'mastodon.social');
