#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { searchInputSchema, handleSearch } from './tools/search.js';
import { transcriptInputSchema, handleTranscript } from './tools/transcript.js';
import { videoInfoInputSchema, handleVideoInfo } from './tools/video-info.js';
import { channelVideosInputSchema, handleChannelVideos } from './tools/channel-videos.js';
import { channelInfoInputSchema, handleChannelInfo } from './tools/channel-info.js';
import { playlistInputSchema, handlePlaylist } from './tools/playlist.js';
import { downloadInputSchema, handleDownload } from './tools/download.js';
import { clipInputSchema, handleClip } from './tools/clip.js';
import { highlightReelInputSchema, handleHighlightReel } from './tools/highlight-reel.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));
const server = new McpServer({
    name: 'youtube',
    version: pkg.version,
});
const READ_ONLY_ANNOTATIONS = {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
};
server.registerTool('youtube_search', {
    description: 'Search YouTube for videos, channels, or playlists. Supports filtering by upload date (today/week/month/year), duration (short/medium/long), and sorting (relevance/date/views/rating). Returns results with metadata including title, channel, views, duration, and whether results are personalized.',
    inputSchema: searchInputSchema,
    annotations: READ_ONLY_ANNOTATIONS,
}, handleSearch);
server.registerTool('youtube_get_transcript', {
    description: 'Get the transcript of a YouTube video. Control output size with: "format" — "text" (fullText only, smallest), "segments" (timestamps only), or "both" (default). Use "startTime"/"endTime" (seconds) to grab a specific section (pairs well with chapter timestamps from youtube_get_video_info). Use "maxSegments" to cap output for previewing long videos.',
    inputSchema: transcriptInputSchema,
    annotations: READ_ONLY_ANNOTATIONS,
}, handleTranscript);
server.registerTool('youtube_get_video_info', {
    description: 'Get metadata for a YouTube video. Use "detail" to control response size: "brief" (key stats only — title, channel, views, likes, duration), "standard" (default — most fields, truncated description, chapter count), or "full" (everything including full description, chapters, tags, thumbnail).',
    inputSchema: videoInfoInputSchema,
    annotations: READ_ONLY_ANNOTATIONS,
}, handleVideoInfo);
server.registerTool('youtube_get_channel_videos', {
    description: 'List videos from a YouTube channel. Accepts @handle, full URL, or channel ID. Returns videos sorted by newest, popular, or oldest.',
    inputSchema: channelVideosInputSchema,
    annotations: READ_ONLY_ANNOTATIONS,
}, handleChannelVideos);
server.registerTool('youtube_get_channel_info', {
    description: 'Get metadata for a YouTube channel — name, handle, description, subscriber count, country, and more. Accepts @handle, full URL, or channel ID.',
    inputSchema: channelInfoInputSchema,
    annotations: READ_ONLY_ANNOTATIONS,
}, handleChannelInfo);
server.registerTool('youtube_get_playlist', {
    description: 'Get a YouTube playlist\'s metadata and its videos. Returns title, description, channel, video count, and the list of videos with their positions.',
    inputSchema: playlistInputSchema,
    annotations: READ_ONLY_ANNOTATIONS,
}, handlePlaylist);
const DOWNLOAD_ANNOTATIONS = {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: true,
};
server.registerTool('youtube_download', {
    description: 'Download a YouTube video or audio track to a local file. Defaults to 720p quality. Supports quality selection (720p/1080p/best/etc.), download type (video+audio/audio/video), and format. Videos over 30 minutes trigger a confirmation prompt — use force: true to bypass. For video+audio, automatically downloads and muxes separate streams.',
    inputSchema: downloadInputSchema,
    annotations: DOWNLOAD_ANNOTATIONS,
}, handleDownload);
server.registerTool('youtube_clip', {
    description: 'Extract one or more clips from a YouTube video by timestamp. Downloads the source video once at 720p, then cuts each clip. Each clip needs startTime and endTime (seconds, MM:SS, or HH:MM:SS) and an optional label for the filename. Uses fast keyframe-aligned cuts by default — do NOT set accurate: true unless the user explicitly asks for frame-perfect precision (it re-encodes and is much slower). Keep clips tight — 5-10 seconds each, capturing one key moment per clip. When 2+ clips are provided, automatically produces a per-video highlight reel alongside individual clips.',
    inputSchema: clipInputSchema,
    annotations: DOWNLOAD_ANNOTATIONS,
}, handleClip);
server.registerTool('youtube_highlight_reel', {
    description: 'Combine existing clip files into a single highlight reel. Pass file paths from previous youtube_clip results in your desired playback order. Use this after clipping multiple videos to create one combined reel across all sources. The order of the clips array determines playback order — arrange clips for narrative flow before calling.',
    inputSchema: highlightReelInputSchema,
    annotations: DOWNLOAD_ANNOTATIONS,
}, handleHighlightReel);
const transports = new Map();
async function main() {
    const isSseMode = process.env.PORT || process.argv.includes('--sse');
    if (isSseMode) {
        const app = express();
        app.use(cors());
        app.use(express.json());
        // Serve static dashboard files
        const publicPath = resolve(__dirname, '..', 'public');
        app.use(express.static(publicPath));
        app.get('/', (req, res) => {
            res.sendFile(join(publicPath, 'index.html'));
        });
        // SSE endpoint for establishing the stream
        app.get('/sse', async (req, res) => {
            try {
                const transport = new SSEServerTransport('/messages', res);
                const sessionId = transport.sessionId;
                transports.set(sessionId, transport);
                transport.onclose = () => {
                    transports.delete(sessionId);
                };
                await server.connect(transport);
            }
            catch (error) {
                console.error('Error establishing SSE stream:', error);
                if (!res.headersSent) {
                    res.status(500).send('Error establishing SSE stream');
                }
            }
        });
        // Messages endpoint for receiving client JSON-RPC requests
        app.post('/messages', async (req, res) => {
            const sessionId = req.query.sessionId;
            if (!sessionId) {
                res.status(400).send('Missing sessionId parameter');
                return;
            }
            const transport = transports.get(sessionId);
            if (!transport) {
                res.status(404).send('Session not found');
                return;
            }
            try {
                await transport.handlePostMessage(req, res, req.body);
            }
            catch (error) {
                console.error('Error handling post message:', error);
                if (!res.headersSent) {
                    res.status(500).send('Error handling request');
                }
            }
        });
        // JSON API for the custom dashboard
        app.get('/api/search', async (req, res) => {
            try {
                const query = req.query.q;
                const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
                const type = req.query.type;
                const uploadDate = req.query.uploadDate;
                const duration = req.query.duration;
                const sortBy = req.query.sortBy;
                if (!query) {
                    res.status(400).json({ error: 'Missing query parameter "q"' });
                    return;
                }
                const result = await handleSearch({
                    query,
                    limit,
                    type,
                    uploadDate,
                    duration,
                    sortBy,
                });
                res.json(JSON.parse(result.content[0].text));
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.get('/api/transcript', async (req, res) => {
            try {
                const videoId = req.query.videoId;
                const language = req.query.language;
                const format = req.query.format;
                const startTime = req.query.startTime ? parseFloat(req.query.startTime) : undefined;
                const endTime = req.query.endTime ? parseFloat(req.query.endTime) : undefined;
                const maxSegments = req.query.maxSegments ? parseInt(req.query.maxSegments, 10) : undefined;
                if (!videoId) {
                    res.status(400).json({ error: 'Missing videoId parameter' });
                    return;
                }
                const result = await handleTranscript({
                    videoId,
                    language,
                    format,
                    startTime,
                    endTime,
                    maxSegments,
                });
                if (result.isError) {
                    res.status(400).json(JSON.parse(result.content[0].text));
                }
                else {
                    res.json(JSON.parse(result.content[0].text));
                }
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.get('/api/video-info', async (req, res) => {
            try {
                const videoId = req.query.videoId;
                const detail = req.query.detail;
                if (!videoId) {
                    res.status(400).json({ error: 'Missing videoId parameter' });
                    return;
                }
                const result = await handleVideoInfo({ videoId, detail });
                res.json(JSON.parse(result.content[0].text));
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.post('/api/clip', async (req, res) => {
            try {
                const { videoId, clips, accurate, force, quality, highlightReel } = req.body;
                if (!videoId || !clips || !Array.isArray(clips)) {
                    res.status(400).json({ error: 'Missing required parameters "videoId" and "clips"' });
                    return;
                }
                const downloadsDir = resolve(__dirname, '..', 'public', 'downloads');
                const result = await handleClip({
                    videoId,
                    clips,
                    accurate,
                    force,
                    quality,
                    highlightReel,
                    outputDir: downloadsDir,
                });
                const parsed = JSON.parse(result.content[0].text);
                // Map absolute filePaths to relative web paths
                const makeRelative = (absolutePath) => {
                    const filename = absolutePath.split('/').pop() || '';
                    return `/downloads/${encodeURIComponent(filename)}`;
                };
                if (parsed.highlightReel) {
                    parsed.highlightReel.downloadUrl = makeRelative(parsed.highlightReel.filePath);
                }
                if (parsed.clips) {
                    parsed.clips.forEach((c) => {
                        c.downloadUrl = makeRelative(c.filePath);
                    });
                }
                else if (Array.isArray(parsed)) {
                    parsed.forEach((c) => {
                        c.downloadUrl = makeRelative(c.filePath);
                    });
                }
                res.json(parsed);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.post('/api/download', async (req, res) => {
            try {
                const { videoId, quality, type, format, force } = req.body;
                if (!videoId) {
                    res.status(400).json({ error: 'Missing required parameter "videoId"' });
                    return;
                }
                // Fetch video title to construct clean filename
                const infoResult = await handleVideoInfo({ videoId, detail: 'brief' });
                const info = JSON.parse(infoResult.content[0].text);
                const title = info.title || 'video';
                const downloadsDir = resolve(__dirname, '..', 'public', 'downloads');
                const containerFormat = format || 'mp4';
                const safeName = title.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
                const outputPath = join(downloadsDir, `${safeName}.${containerFormat}`);
                const result = await handleDownload({
                    videoId,
                    quality,
                    type,
                    format: containerFormat,
                    force,
                    outputPath,
                });
                const parsed = JSON.parse(result.content[0].text);
                if (parsed.filePath) {
                    const filename = parsed.filePath.split('/').pop() || '';
                    parsed.downloadUrl = `/downloads/${encodeURIComponent(filename)}`;
                }
                res.json(parsed);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.error(`YouTube MCP server and dashboard listening on port ${port} over SSE`);
        });
        // Graceful shutdown
        const shutdown = async () => {
            console.error('Shutting down server...');
            for (const [sessionId, transport] of transports.entries()) {
                try {
                    await transport.close();
                }
                catch (err) {
                    console.error(`Error closing session ${sessionId}:`, err);
                }
            }
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }
}
main().catch((error) => {
    console.error('YouTube MCP server failed to start:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map