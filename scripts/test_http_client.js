import { Innertube } from 'youtubei.js';

async function test() {
  const yt = await Innertube.create();
  console.log(Object.keys(yt.session.http));
}

test();
