import { Innertube } from 'youtubei.js';
import { loadCookies } from '../dist/lib/cookies.js';

async function test() {
  try {
    const cookieString = loadCookies();
    const yt = await Innertube.create({ cookie: cookieString, retrieve_player: true });
    
    console.log('Fetching video info...');
    const info = await yt.getInfo('8ZCMDvkusKI');
    
    if (info.captions) {
        console.log('Captions found in video info!');
        const captionTracks = info.captions.caption_tracks;
        if (captionTracks && captionTracks.length > 0) {
            const track = captionTracks[0];
            console.log('Downloading track:', track.name?.toString() || track.language_code);
            console.log('Base URL:', track.base_url);
            
            // Extract the User-Agent that youtubei.js is currently using for its session
            const userAgent = yt.session.context.client.userAgent;
            console.log('youtubei.js User-Agent:', userAgent);
            
            const headers = {
                'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };
            if (cookieString) {
                headers['Cookie'] = cookieString;
            }
            
            const response = await fetch(track.base_url, { headers });
            
            console.log('Response status:', response.status);
            
            const text = await response.text();
            console.log('Transcript text length:', text.length);
            if (text.length > 0) {
                console.log('Snippet:', text.substring(0, 200));
            }
        }
    } else {
        console.log('No captions found');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
