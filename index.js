require('dotenv').config();
const express = require('express');

const app = express();

app.get('*', (req, res) => {
	console.log('got a request!', req.path, req.query, req.body);
	res.status(200).end();
});

app.listen(process.env.PORT || 3000);