require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
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

async function initialize(init) {
  await fetchPhotos();
  console.log(data);
  init ? update() : updateAll()
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


function updateByDate(date){
  const photos = data.filter(items => {
    // Extract the date part from the creationTime
    const created = items.mediaMetadata.creationTime.split('T')[0];
    return created === date;
  });
  if (photos.length) {
      const file = `${date}.md`
      console.log(`Media being added to ${file}...`);
      const mediaMarkup = data.map(item => {
        const url = item.baseUrl;
        if (item.mimeType.startsWith('video/')) {
          return `<a href="${url}">${url}#</a>`;
        } else if (item.mimeType.startsWith('image/')) {
          return `<img src="${url}" alt="" style="max-width: 100%; height: auto;">`;
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
  // ADVFWbeu50_RulrcDCXNkLO7stKdAmGPiTSKxC2SEjvKGApt6yaiPn8XlJzaDA_ITvCp1dr_Hyyw
  // const file = path.join(diaryPath, `${year}-${month}-${day}.md`)
  // if (data.mediaItems && data.mediaItems.length > 0 && fs.existsSync(file)) {
  //   console.log(`Media being added to ${file}...`);
  //   const mediaMarkup = data.mediaItems.map(mediaItem => {
  //     const url = mediaItem.baseUrl;
  //     if (mediaItem.mimeType.startsWith('video/')) {
  //       return `<a href="${url}">${url}#</a>`;
  //     } else if (mediaItem.mimeType.startsWith('image/')) {
  //       return `<img src="${url}" alt="" style="max-width: 100%; height: auto;">`;
  //     }
  //   }).join(' ');
  
  //   let content = fs.readFileSync(file, 'utf8');
  //   const mediaSection = `<div style="display: flex; flex-wrap: wrap; gap: 10px;">${mediaMarkup}</div>`;
  //   if (content.includes('## Media')) {
  //     const parts = content.split('## Media');
  //     content = parts[0] + `## Media\n\n${mediaSection}\n`;
  //   } else {
  //     content += `\n## Media\n\n${mediaSection}\n`;
  //   }
  //   fs.writeFileSync(file, content, 'utf8');
  // }
  
}


// update();
initialize();

// if (nextPageToken) {}

// 1. 全部とってJSONに格納する
// 2. 必要な日付の分を取る