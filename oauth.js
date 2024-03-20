require('dotenv').config();
const express = require('express');
const {OAuth2Client} = require('google-auth-library');

const app = express();
const port = 3000;

const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
);

app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/photoslibrary.readonly'],
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const {tokens} = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);
  console.log(tokens);
  res.send('Authentication successful! Please check your console.');
});

app.listen(port, () => {
  console.log(`Go to http://localhost:3000/auth and proceed to OAuth2 flow!`);
});

