import { Innertube } from 'youtubei.js';
import { loadCookies } from '../dist/lib/cookies.js';

async function test() {
  try {
    const cookieString = loadCookies();
    const yt = await Innertube.create({ cookie: cookieString });
    
    console.log('Fetching video info...');
    const info = await yt.getInfo('8ZCMDvkusKI');
    
    if (info.captions) {
        console.log('Captions found in video info!');
        const captionTracks = info.captions.caption_tracks;
        if (captionTracks && captionTracks.length > 0) {
            console.log('Available tracks:', captionTracks.map(t => t.language_code));
            
            // Try to download the first track
            const track = captionTracks[0];
            console.log('Downloading track:', track.name?.toString() || track.language_code);
            console.log('Base URL:', track.base_url);
            
            // The caption track object has a base_url we can fetch directly!
            const url = track.base_url;
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                console.error(`Fetch failed with status ${response.status}`);
                return;
            }
            const text = await response.text();
            
            console.log('Transcript text length:', text.length);
            console.log('Transcript text:', text);
        } else {
            console.log('No caption tracks found.');
        }
    } else {
        console.log('No captions object in video info.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
