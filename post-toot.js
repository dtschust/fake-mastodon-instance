const sendMessage = require('./send-message');

const user = 'pepsi';
const now = Date.now();
const id = `post-${now}`;
const noteId = `toot-${now}`;
const message = {
	"@context": "https://www.w3.org/ns/activitystreams",

	"id": `https://fake-mastodon-instance.herokuapp.com/${id}`,
	"type": "Create",
	"actor": `https://fake-mastodon-instance.herokuapp.com/users/${user}`,

	"object": {
		"id": `https://fake-mastodon-instance.herokuapp.com/${noteId}`,
		"type": "Note",
		"published": `${new Date().toISOString()}`,
		"attributedTo": `https://fake-mastodon-instance.herokuapp.com/users/${user}`,
		"content": "<p>Are _we_ ok?</p>",
		"to": "https://www.w3.org/ns/activitystreams#Public"
	}
}

sendMessage(message, user, 'mastodon.social');