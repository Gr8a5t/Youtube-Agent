import { Innertube } from 'youtubei.js';

async function test() {
  const yt = await Innertube.create();
  const info = await yt.getInfo('8ZCMDvkusKI', 'ANDROID');
  
  if (info.captions && info.captions.caption_tracks) {
      const url = info.captions.caption_tracks[0].base_url;
      console.log('URL:', url.substring(0, 50));
      
      const res = await yt.session.http.fetch(url);
      console.log('Status:', res.status);
      console.log('Text length:', (await res.text()).length);
  } else {
      console.log('No captions found');
  }
}

test();
