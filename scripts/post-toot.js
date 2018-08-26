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
		content: '<p>This is a DM I think?</p>',
		tag: [],
		// to: 'https://www.w3.org/ns/activitystreams#Public', // TODO figure out how to make these not public
		// to: ['https://mastodon.social/users/nuncatest'], // TODO figure out how to send DMs, but I don't really care
		to: [
			`https://fake-mastodon-instance.herokuapp.com/users/${user}/followers`,
		],
	},
};

sendMessage(message, user, 'mastodon.social');
