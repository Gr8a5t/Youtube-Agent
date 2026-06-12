import { Innertube } from 'youtubei.js';
import { loadCookies } from '../dist/lib/cookies.js';

async function test() {
  try {
    const cookieString = loadCookies();
    const yt = await Innertube.create({ cookie: cookieString, retrieve_player: false });
    
    console.log('Fetching basic video info...');
    const info = await yt.getBasicInfo('8ZCMDvkusKI');
    
    if (info.captions) {
        console.log('Captions found via getBasicInfo!');
        console.log(info.captions.caption_tracks.length, 'tracks');
    } else {
        console.log('No captions in getBasicInfo.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
