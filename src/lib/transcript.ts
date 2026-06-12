import { getConfig } from './user-config.js';
import { loadCookies } from './cookies.js';

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  fullText: string;
  language: string;
}

export interface TranscriptError {
  error: string;
}

export function cleanTranscriptText(text: string): string {
  return text
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, (match) => {
      const code = parseInt(match.slice(2, -1), 10);
      return String.fromCharCode(code);
    });
}

const YOUTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

import { getInstance } from './innertube.js';

export async function getTranscript(
  videoId: string,
  language?: string,
): Promise<TranscriptResult | TranscriptError> {
  try {
    const config = getConfig();
    const lang = language ?? config.transcript.defaultLanguage;
    
    // 1. Use the global, authenticated Innertube instance which natively handles poTokens
    const { yt } = await getInstance();
    
    // We use the WEB client because youtubei.js can generate valid poTokens for it
    const info = await yt.getInfo(videoId, { client: 'WEB' });
    const isPlayableOk = info.playability_status?.status === 'OK';
    
    if (!info.captions || !info.captions.caption_tracks || info.captions.caption_tracks.length === 0) {
        if (!isPlayableOk) {
             console.error('[YOUTUBE PLAYABILITY STATUS]', JSON.stringify(info.playability_status));
             return { error: `Video ${videoId} is unavailable — it may have been removed or is private.` };
        }
        return { error: `Transcripts are disabled or unavailable for video ${videoId}.` };
    }
    
    const tracks = info.captions.caption_tracks;
    
    // 2. Find preferred language
    let selectedTrack = tracks.find((t: any) => t.language_code === lang);
    if (!selectedTrack) {
        selectedTrack = tracks[0]; // fallback to first
    }
    
    let transcriptURL = selectedTrack.base_url;
    if (!transcriptURL) {
        return { error: `Could not extract transcript URL for video ${videoId}.` };
    }
    
    // Strip format parameter if it exists to ensure we get the pure XML that matches the signature
    transcriptURL = transcriptURL.replace(/&fmt=[^&]+/, '');
    
    // 3. Fetch the signed transcript XML (no headers needed since the signature is valid)
    const transcriptResponse = await fetch(transcriptURL);
    
    if (!transcriptResponse.ok) {
        const errText = await transcriptResponse.text().catch(() => 'unreadable');
        console.error('[YOUTUBE TRANSCRIPT XML ERROR BODY]', errText);
        if (transcriptResponse.status === 429) {
             return { error: `Rate limited by YouTube. Wait a moment and try again.` };
        }
        return { error: `Failed to download transcript XML. Status: ${transcriptResponse.status}. Body: ${errText.substring(0, 200)}` };
    }
    
    const transcriptXml = await transcriptResponse.text();
    if (!transcriptXml || transcriptXml.length === 0) {
        return { error: `YouTube returned empty transcript data.` };
    }
    
    // 4. Parse the simple XML structure (<text start="0" dur="1.5">hello</text>)
    const textNodes = transcriptXml.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
    
    const segments: TranscriptSegment[] = [];
    for (const node of textNodes) {
        const startMatch = node.match(/start="([^"]+)"/);
        const durMatch = node.match(/dur="([^"]+)"/);
        const textMatch = node.match(/>([^<]*)<\/text>/);
        
        if (startMatch && textMatch) {
            segments.push({
                offset: parseFloat(startMatch[1]) * 1000,
                duration: durMatch ? parseFloat(durMatch[1]) * 1000 : 0,
                text: decodeHtmlEntities(textMatch[1])
            });
        }
    }
    
    if (segments.length === 0) {
         return { error: `Failed to parse transcript segments from XML.` };
    }
    
    // 5. Build final result
    const finalSegments = segments.slice(0, config.transcript.maxSegments);
    const joinedText = finalSegments.map(s => s.text).join(' ');
    const fullText = config.transcript.cleanupEnabled
      ? cleanTranscriptText(joinedText)
      : joinedText;

    return {
      segments: finalSegments,
      fullText,
      language: selectedTrack.language_code || lang,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Could not fetch transcript for video ${videoId}: ${message}` };
  }
}
