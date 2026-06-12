import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { DEFAULTS } from '../config.js';
function getCookiePath() {
    const dataDir = process.env.CLAUDE_PLUGIN_DATA;
    if (!dataDir) {
        return join(process.cwd(), `.${DEFAULTS.auth.cookieFilename}`);
    }
    return join(dataDir, DEFAULTS.auth.cookieFilename);
}
export function hasCookies() {
    const cookiePath = getCookiePath();
    if (!existsSync(cookiePath))
        return false;
    try {
        const content = readFileSync(cookiePath, 'utf8');
        const parsed = JSON.parse(content);
        return typeof parsed.cookie_string === 'string' && parsed.cookie_string.length > 0;
    }
    catch {
        return false;
    }
}
function parseNetscapeCookies(content) {
    const lines = content.split('\n');
    const cookiePairs = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        let parts = trimmed.split('\t');
        if (parts.length < 7) {
            parts = trimmed.split(/\s+/);
        }
        if (parts.length >= 7) {
            const name = parts[5];
            const value = parts.slice(6).join(' ').replace(/\r$/, '');
            cookiePairs.push(`${name}=${value}`);
        }
    }
    return cookiePairs.join('; ');
}
export function loadCookies() {
    // 0. Try direct YOUTUBE_COOKIES environment variable content
    let envCookies = process.env.YOUTUBE_COOKIES;
    if (envCookies) {
        try {
            // Fix literal escaped newlines and tabs from CI/CD platforms like Render
            envCookies = envCookies.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            const localCookies = join(process.cwd(), 'cookies.txt');
            let shouldSync = false;
            if (!existsSync(localCookies)) {
                shouldSync = true;
            }
            else {
                const diskContent = readFileSync(localCookies, 'utf8');
                if (diskContent.trim() !== envCookies.trim()) {
                    shouldSync = true;
                }
            }
            if (shouldSync) {
                console.log('[Cookies] Syncing YOUTUBE_COOKIES env var content to disk...');
                saveCookies(envCookies);
            }
            if (envCookies.includes('\t') || envCookies.includes('# Netscape')) {
                return parseNetscapeCookies(envCookies);
            }
            try {
                const parsed = JSON.parse(envCookies);
                return parsed.cookie_string ?? envCookies;
            }
            catch {
                return envCookies;
            }
        }
        catch (e) {
            console.error('[Cookies] Error syncing env cookies to disk:', e);
        }
    }
    // 1. Try env var path
    const envPath = process.env.YOUTUBE_COOKIES_PATH;
    if (envPath && existsSync(envPath)) {
        try {
            const content = readFileSync(envPath, 'utf8');
            if (content.includes('\t')) {
                return parseNetscapeCookies(content);
            }
            const parsed = JSON.parse(content);
            return parsed.cookie_string ?? null;
        }
        catch { }
    }
    // 2. Try cookies.txt
    const localCookies = join(process.cwd(), 'cookies.txt');
    if (existsSync(localCookies)) {
        try {
            return parseNetscapeCookies(readFileSync(localCookies, 'utf8'));
        }
        catch { }
    }
    // 3. Try .cookies.txt
    const dotCookies = join(process.cwd(), '.cookies.txt');
    if (existsSync(dotCookies)) {
        try {
            return parseNetscapeCookies(readFileSync(dotCookies, 'utf8'));
        }
        catch { }
    }
    const cookiePath = getCookiePath();
    if (!existsSync(cookiePath))
        return null;
    try {
        const content = readFileSync(cookiePath, 'utf8');
        const parsed = JSON.parse(content);
        if (typeof parsed.cookie_string === 'string' && parsed.cookie_string.length > 0) {
            if (parsed.cookie_string.includes('\t')) {
                return parseNetscapeCookies(parsed.cookie_string);
            }
            return parsed.cookie_string;
        }
        return null;
    }
    catch {
        return null;
    }
}
export function deleteCookies() {
    let deleted = false;
    const localCookies = join(process.cwd(), 'cookies.txt');
    if (existsSync(localCookies)) {
        try {
            unlinkSync(localCookies);
            deleted = true;
        }
        catch { }
    }
    const dotCookies = join(process.cwd(), '.cookies.txt');
    if (existsSync(dotCookies)) {
        try {
            unlinkSync(dotCookies);
            deleted = true;
        }
        catch { }
    }
    const cookiePath = getCookiePath();
    if (existsSync(cookiePath)) {
        try {
            unlinkSync(cookiePath);
            deleted = true;
        }
        catch { }
    }
    return deleted;
}
export function saveCookies(cookieString) {
    // If it's Netscape format, write it to cookies.txt as well
    if (cookieString.includes('\t') || cookieString.includes('# Netscape')) {
        const localCookies = join(process.cwd(), 'cookies.txt');
        writeFileSync(localCookies, cookieString, 'utf8');
    }
    const cookiePath = getCookiePath();
    const dir = dirname(cookiePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(cookiePath, JSON.stringify({ cookie_string: cookieString }, null, 2));
}
export function validateCookies(cookieString) {
    const cookieNames = cookieString
        .split(';')
        .map(c => c.trim().split('=')[0]);
    const present = [];
    const missing = [];
    for (const required of DEFAULTS.auth.requiredCookies) {
        if (cookieNames.includes(required)) {
            present.push(required);
        }
        else {
            missing.push(required);
        }
    }
    return {
        valid: missing.length === 0,
        present,
        missing,
    };
}
//# sourceMappingURL=cookies.js.map