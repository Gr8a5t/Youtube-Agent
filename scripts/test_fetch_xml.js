import { Innertube } from 'youtubei.js';
import { loadCookies } from '../dist/lib/cookies.js';
import * as https from 'https';

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
            console.log('Downloading track:', track.name?.toString() || track.language_code);
            console.log('Base URL:', track.base_url);
            
            const options = {
                headers: {
                    'Cookie': cookieString || '',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
            
            https.get(track.base_url, options, (res) => {
                let data = '';
                console.log('Status Code:', res.statusCode);
                console.log('Content-Type:', res.headers['content-type']);
                console.log('Content-Encoding:', res.headers['content-encoding']);
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log('Transcript text length:', data.length);
                    console.log('Transcript text snippet:', data.substring(0, 500));
                });
            }).on('error', err => {
                console.error('HTTPS Error:', err.message);
            });
        }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
