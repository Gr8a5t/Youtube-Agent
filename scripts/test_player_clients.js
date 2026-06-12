import { getConfig } from '../dist/lib/user-config.js';
import { loadCookies } from '../dist/lib/cookies.js';

async function test() {
    const videoId = '8ZCMDvkusKI';
    const YOUTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    
    const cookieString = loadCookies();
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    if (cookieString) headers['Cookie'] = cookieString;
    
    const clients = [
        { clientName: 'ANDROID', clientVersion: '20.10.38' },
        { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0' },
        { clientName: 'WEB_EMBED', clientVersion: '2.20240101.00.00' },
        { clientName: 'IOS', clientVersion: '19.42.1' },
    ];
    
    for (const client of clients) {
        console.log(`\nTesting client: ${client.clientName}...`);
        const playerEndpoint = `https://www.youtube.com/youtubei/v1/player?key=${YOUTUBE_API_KEY}`;
        const playerBody = {
            context: { client },
            videoId: videoId,
        };
        
        const playerRes = await fetch(playerEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(playerBody)
        });
        
        const playerJson = await playerRes.json();
        const status = playerJson?.playabilityStatus?.status;
        console.log(`Status: ${status}`);
        if (status !== 'OK') {
             console.log(`Reason: ${playerJson?.playabilityStatus?.reason}`);
        } else {
            const tracklist = playerJson?.captions?.playerCaptionsTracklistRenderer;
            const tracks = tracklist?.captionTracks;
            console.log(`Tracks found: ${tracks?.length || 0}`);
            if (tracks && tracks.length > 0) {
                console.log(`Base URL: ${tracks[0].baseUrl.substring(0, 100)}...`);
            }
        }
    }
}

test();
