require('dotenv').config();
var Twit = require('twit')

var T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
})

//
//  tweet 'hello world!'
//
T.get('statuses/user_timeline', { screen_name: 'realdonaldtrump', count: 2 }, function(err, data, response) {
  console.log(data)
})
