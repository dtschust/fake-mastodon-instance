const sendMessage = require('../src/send-message');

const user = 'nuncamind';
const now = Date.now();
const id = `post-${now}`;
const noteId = `toot-${now}`;
const message = {
	'@context': 'https://www.w3.org/ns/activitystreams',

	id: `https://toot.rip/${id}`,
	type: 'Create',
	actor: `https://toot.rip/users/${user}`,

	object: {
		id: `https://toot.rip/${noteId}`,
		type: 'Note',
		published: `${new Date().toISOString()}`,
		attributedTo: `https://toot.rip/users/${user}`,
		content: '<p>This is a followers only message</p>',
		tag: [],
		// to: 'https://www.w3.org/ns/activitystreams#Public', // public
		// Below should send DMs, doesn't work but I don't really care. For DM to work it needs to mention the user, and have a tag with a mention in it
		// to: ['https://mastodon.social/users/nuncatest'],
		to: [`https://toot.rip/users/${user}/followers`],
	},
};

sendMessage(message, user, 'mastodon.social');
