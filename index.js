require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const { exec } = require('child_process');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});
let data = [];

async function main(init) {
  await fetchPhotos();
  init ? updateAll() : update()
}

function update() {
  exec('git status --porcelain ./docs/_diary', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
  
    const lines = stdout.split('\n');
    const regex = /_diary\/(\d{4}-\d{2}-\d{2})\.md$/;
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        updateByDate(match[1])
      }
    }
  });
}

function updateAll(){
  const startDate = new Date('2024-03-09');
  const today = new Date();

  for (let date = startDate; date <= today; date.setDate(date.getDate() + 1)) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');;
      const day = date.getDate().toString().padStart(2, '0');
      updateByDate(`${year}-${month}-${day}`);
  }
}

function updateByDate(date){
  let photos = [];
  for (item of data[0]){
    if (date === item.mediaMetadata.creationTime.split('T')[0]) photos.push(item)
  }
  if (photos.length) {
      const file = `./docs/_diary/${date}.md`
      console.log(`Media being added/updated for ${file}...`);
      const mediaMarkup = photos.map(item => {
        if (item.mimeType.startsWith('video/')) {
          return `<a href="${item.productUrl}">video</a><br>`;
        } else if (item.mimeType.startsWith('image/')) {
          return `<img src="${item.baseUrl}" alt="" style="max-width: 100%; height: auto;"><br>`;
        }
      }).join(' ');
    
      let content = fs.readFileSync(file, 'utf8');
      const mediaSection = `<div style="display: flex; flex-wrap: wrap; gap: 10px;">${mediaMarkup}</div>`;
      if (content.includes('## Media')) {
        const parts = content.split('## Media');
        content = parts[0] + `## Media\n\n${mediaSection}\n`;
      } else {
        content += `\n## Media\n\n${mediaSection}\n`;
      }
      fs.writeFileSync(file, content, 'utf8');
  }
}

async function fetchPhotos(pageToken) {
  const body = {
    "pageSize": 100,
    "albumId": process.env.ALBUM_ID,
  };
  if (pageToken) body.pageToken = pageToken;
  const accessToken = await oauth2Client.getAccessToken();
  const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
  });
  const items = await response.json()
  data.push(items.mediaItems)
  if (next = items.nextPageToken) {
    fetchPhotos(next);
  }
}

// 基本全部更新
console.log(`Your google test token is: ${GOOGLE_TEST_TOKEN}`)
main(true)