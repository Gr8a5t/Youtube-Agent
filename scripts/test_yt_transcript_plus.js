import { fetchTranscript } from 'youtube-transcript-plus';
import { loadCookies } from '../dist/lib/cookies.js';

async function test() {
  const cookieString = loadCookies();
  const fetchOptions = {};
  
  if (cookieString) {
      const headers = {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      fetchOptions.videoFetch = async ({ url, lang: fetchLang }) => {
        return fetch(url, { headers });
      };
      fetchOptions.playerFetch = async ({ url, method, body, headers: reqHeaders }) => {
        return fetch(url, { method, headers: { ...headers, ...reqHeaders }, body });
      };
      fetchOptions.transcriptFetch = async ({ url, lang: fetchLang }) => {
        console.log('[TranscriptPlus Debug] URL:', url);
        console.log('[TranscriptPlus Debug] lang:', fetchLang);
        console.log('[TranscriptPlus Debug] Headers:', headers);
        const response = await fetch(url, { headers });
        const text = await response.clone().text();
        console.log('[TranscriptPlus Debug] Response length:', text.length);
        return response;
      };
  }

  try {
      const data = await fetchTranscript('8ZCMDvkusKI', fetchOptions);
      console.log('Transcript fetch success! Length:', data.length);
  } catch (err) {
      console.error('Transcript fetch failed:', err);
  }
}
test();
