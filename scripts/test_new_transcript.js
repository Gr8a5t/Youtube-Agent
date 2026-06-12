import { getTranscript } from '../dist/lib/transcript.js';

async function test() {
  const result = await getTranscript('8ZCMDvkusKI');
  if ('error' in result) {
    console.error('Transcript fetch failed:', result.error);
    process.exit(1);
  }
  console.log('Transcript fetch success!');
  console.log('Language:', result.language);
  console.log('Number of segments:', result.segments?.length);
  console.log('Snippet:', result.fullText.substring(0, 300) + '...');
}
test();
