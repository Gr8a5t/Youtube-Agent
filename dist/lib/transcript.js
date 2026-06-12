import { getConfig } from './user-config.js';
import { loadCookies } from './cookies.js';
export function cleanTranscriptText(text) {
    return text
        .replace(/\[.*?\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function decodeHtmlEntities(text) {
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
export async function getTranscript(videoId, language) {
    try {
        const config = getConfig();
        const lang = language ?? config.transcript.defaultLanguage;
        const cookieString = loadCookies();
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        if (cookieString) {
            headers['Cookie'] = cookieString;
        }
        // 1. Fetch player endpoint using Android client spoofing (bypasses poToken blocks)
        const playerEndpoint = `https://www.youtube.com/youtubei/v1/player?key=${YOUTUBE_API_KEY}`;
        const playerBody = {
            context: {
                client: {
                    clientName: 'ANDROID',
                    clientVersion: '20.10.38',
                },
            },
            videoId: videoId,
        };
        const playerRes = await fetch(playerEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(playerBody)
        });
        if (!playerRes.ok) {
            return { error: `YouTube player API returned status ${playerRes.status}` };
        }
        const playerJson = await playerRes.json();
        const tracklist = playerJson?.captions?.playerCaptionsTracklistRenderer;
        const tracks = tracklist?.captionTracks;
        const isPlayableOk = playerJson?.playabilityStatus?.status === 'OK';
        if (!tracks || tracks.length === 0) {
            if (!isPlayableOk) {
                return { error: `Video ${videoId} is unavailable — it may have been removed or is private.` };
            }
            return { error: `Transcripts are disabled or unavailable for video ${videoId}.` };
        }
        // 2. Find preferred language
        let selectedTrack = tracks.find((t) => t.languageCode === lang);
        if (!selectedTrack) {
            selectedTrack = tracks[0]; // fallback to first
        }
        let transcriptURL = selectedTrack.baseUrl || selectedTrack.url;
        if (!transcriptURL) {
            return { error: `Could not extract transcript URL for video ${videoId}.` };
        }
        // Strip format parameter if it exists to ensure we get the pure XML that matches the signature
        transcriptURL = transcriptURL.replace(/&fmt=[^&]+/, '');
        // 3. Fetch the signed transcript XML
        const fetchHeaders = {
            'User-Agent': headers['User-Agent']
        };
        if (cookieString) {
            fetchHeaders['Cookie'] = cookieString;
        }
        if (lang) {
            fetchHeaders['Accept-Language'] = lang;
        }
        const transcriptResponse = await fetch(transcriptURL, { headers: fetchHeaders });
        if (!transcriptResponse.ok) {
            if (transcriptResponse.status === 429) {
                return { error: `Rate limited by YouTube. Wait a moment and try again.` };
            }
            return { error: `Failed to download transcript XML. Status: ${transcriptResponse.status}` };
        }
        const transcriptXml = await transcriptResponse.text();
        if (!transcriptXml || transcriptXml.length === 0) {
            return { error: `YouTube returned empty transcript data.` };
        }
        // 4. Parse the simple XML structure (<text start="0" dur="1.5">hello</text>)
        const textNodes = transcriptXml.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
        const segments = [];
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
            language: selectedTrack.languageCode || lang,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { error: `Could not fetch transcript for video ${videoId}: ${message}` };
    }
}
//# sourceMappingURL=transcript.js.map