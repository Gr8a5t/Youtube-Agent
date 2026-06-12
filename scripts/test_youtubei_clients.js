import { Innertube } from 'youtubei.js';
import { loadCookies } from '../dist/lib/cookies.js';

async function test() {
  try {
    const cookieString = loadCookies();
    const yt = await Innertube.create({ cookie: cookieString });
    
    console.log('Fetching video info...');
    const info = await yt.getInfo('8ZCMDvkusKI', 'WEB');
    
    try {
        const transcript = await info.getTranscript();
        console.log('WEB Transcript segments:', transcript.transcript.content?.body?.initial_segments?.length);
    } catch (err) {
        console.log('WEB Transcript error:', err.message);
    }
    
    console.log('\nFetching video info ANDROID...');
    const infoAndroid = await yt.getInfo('8ZCMDvkusKI', 'ANDROID');
    try {
        const transcript = await infoAndroid.getTranscript();
        console.log('ANDROID Transcript segments:', transcript.transcript.content?.body?.initial_segments?.length);
    } catch (err) {
        console.log('ANDROID Transcript error:', err.message);
    }
    
    console.log('\nFetching video info IOS...');
    const infoIos = await yt.getInfo('8ZCMDvkusKI', 'IOS');
    try {
        const transcript = await infoIos.getTranscript();
        console.log('IOS Transcript segments:', transcript.transcript.content?.body?.initial_segments?.length);
    } catch (err) {
        console.log('IOS Transcript error:', err.message);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

test();
