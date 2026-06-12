import { Innertube } from 'youtubei.js';
import { loadCookies } from '../dist/lib/cookies.js';

async function test() {
  try {
    const cookieString = loadCookies();
    const yt = await Innertube.create({ cookie: cookieString });
    
    console.log('Fetching video info...');
    const info = await yt.getInfo('8ZCMDvkusKI');
    
    console.log('Getting transcript...');
    const transcriptData = await info.getTranscript();
    
    console.log('Transcript retrieved successfully! Data:');
    if (transcriptData && transcriptData.transcript) {
        console.log('Transcript content segments:', transcriptData.transcript.content.body.initial_segments.length);
    } else {
        console.log(transcriptData);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
