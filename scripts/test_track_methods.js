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
            const track = captionTracks[0];
            console.log('Track Object Methods:', Object.keys(track));
            console.log('Track Object Prototypes:', Object.getOwnPropertyNames(Object.getPrototypeOf(track)));
        }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
