import { Innertube } from 'youtubei.js';
import { loadCookies } from '../dist/lib/cookies.js';

async function test() {
  const cookieString = loadCookies();
  const yt = await Innertube.create({ cookie: cookieString, generate_session_locally: true });
  console.log('Fetching video info...');
  
  // Note: we use { client: 'WEB' } instead of 'WEB' to satisfy TS
  const info = await yt.getInfo('8ZCMDvkusKI', { client: 'WEB' });
  
  if (info.captions && info.captions.caption_tracks) {
      const url = info.captions.caption_tracks[0].base_url;
      console.log('Base URL:', url.substring(0, 100));
      
      const res1 = await fetch(url);
      console.log('No headers text length:', (await res1.text()).length);
  } else {
      console.log('No captions found');
  }
}

test();
