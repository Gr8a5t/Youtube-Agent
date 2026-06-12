import { Innertube } from 'youtubei.js';

async function test() {
  const yt = await Innertube.create();
  console.log('Fetching video info...');
  const info = await yt.getInfo('8ZCMDvkusKI', 'WEB');
  
  if (info.captions && info.captions.caption_tracks) {
      const url = info.captions.caption_tracks[0].base_url;
      console.log('Base URL:', url.substring(0, 100));
      
      const res1 = await fetch(url);
      console.log('No headers text length:', (await res1.text()).length);
      
      const res2 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
      console.log('Mozilla headers text length:', (await res2.text()).length);
      
      const res3 = await fetch(url, { headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
      } });
      console.log('Full headers text length:', (await res3.text()).length);
      
      const res4 = await fetch(url, { headers: yt.session.context.client });
      console.log('YT context headers text length:', (await res4.text()).length);
  }
}

test();
