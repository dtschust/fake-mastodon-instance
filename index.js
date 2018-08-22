require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_DB_URI, {
	useMongoClient: true,
});

const FemFreqEpisodesModel = mongoose.model('FemFreqEpisodes', {
	episodes: Object,
	order: [String],
});

const app = express();

app.get('/', (req, res) => {
	let storedEpisodesModel;
	FemFreqEpisodesModel.findOne(undefined).exec().then((newStoredEpisodesModel) => {
		storedEpisodesModel = newStoredEpisodesModel || { episodes: {}, order: [] };
		if (!storedEpisodesModel) {
			console.log('nothing to serve!');
			res.status(500).end();
			return;

		}
		const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
<channel>
<title>Feminist Frequency Premium Feed</title>
<link>http://d.rip/femFreq</link>
<language>en-us</language>
<itunes:author>Anita Sarkeesian</itunes:author>
<itunes:summary>Feminist Frequency Radio is coming for your media. Each week, Anita Sarkeesian, Carolyn Petit, and Ebony Aster bring you dispatches from the pop culture wars and invite you to listen in on their entertaining, stimulating, take-no-prisoners conversations about the latest films, games, and tv. They’ll be bringing their distinctly different feminist perspectives to the mix as they celebrate and critique it all. With special guests from all over the feminist media sphere, an assortment of great bonus segments, and your questions keeping them on their toes, Feminist Frequency Radio is there to help you dig deeper into the things you love. Warning: Feminist Frequency Radio may significantly enhance your media experience.</itunes:summary>
<description>Feminist Frequency Radio is coming for your media. Each week, Anita Sarkeesian, Carolyn Petit, and Ebony Aster bring you dispatches from the pop culture wars and invite you to listen in on their entertaining, stimulating, take-no-prisoners conversations about the latest films, games, and tv. They’ll be bringing their distinctly different feminist perspectives to the mix as they celebrate and critique it all. With special guests from all over the feminist media sphere, an assortment of great bonus segments, and your questions keeping them on their toes, Feminist Frequency Radio is there to help you dig deeper into the things you love. Warning: Feminist Frequency Radio may significantly enhance your media experience.</description>
<itunes:owner>
	<itunes:name>Feminist Frequency</itunes:name>
</itunes:owner>
<itunes:explicit>no</itunes:explicit>
<itunes:image href="https://media.simplecast.com/podcast/image/3736/1532460967-artwork.jpg" />

${storedEpisodesModel.order.slice().reverse().map((key) => {
	const { description, url, title, pubDate } = storedEpisodesModel.episodes[key];
	return `<item>
	<title>${title}</title>
	<itunes:summary>${description}</itunes:summary>
	<description>${description}</description>
	<link>${url}</link>
	<enclosure url="${url}" type="audio/mpeg" length="1024"></enclosure>
	<pubDate>${pubDate}</pubDate>
	<itunes:author>Anita Sarkeesian</itunes:author>
	<itunes:duration>00:32:16</itunes:duration>
	<itunes:explicit>no</itunes:explicit>
	<guid>${url}</guid>
</item>`
}).join('\n')}

</channel>
</rss>
`
		res.status(200);
		res.type('application/xml');
		res.send(xml);
	}).catch((e) => {
		console.log('Huh, we have an error', e);
		process.exit(0);
	});
});

app.listen(process.env.PORT || 3000);