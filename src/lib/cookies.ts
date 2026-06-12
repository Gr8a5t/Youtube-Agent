import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { DEFAULTS } from '../config.js';

function getCookiePath(): string {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dataDir) {
    return join(process.cwd(), `.${DEFAULTS.auth.cookieFilename}`);
  }
  return join(dataDir, DEFAULTS.auth.cookieFilename);
}

export function hasCookies(): boolean {
  const cookiePath = getCookiePath();
  if (!existsSync(cookiePath)) return false;
  try {
    const content = readFileSync(cookiePath, 'utf8');
    const parsed = JSON.parse(content);
    return typeof parsed.cookie_string === 'string' && parsed.cookie_string.length > 0;
  } catch {
    return false;
  }
}

function parseNetscapeCookies(content: string): string {
  const lines = content.split('\n');
  const cookiePairs: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('\t');
    if (parts.length >= 7) {
      const name = parts[5];
      const value = parts[6].replace(/\r$/, '');
      cookiePairs.push(`${name}=${value}`);
    }
  }
  return cookiePairs.join('; ');
}

export function loadCookies(): string | null {
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
    } catch {}
  }

  // 2. Try cookies.txt
  const localCookies = join(process.cwd(), 'cookies.txt');
  if (existsSync(localCookies)) {
    try {
      return parseNetscapeCookies(readFileSync(localCookies, 'utf8'));
    } catch {}
  }

  // 3. Try .cookies.txt
  const dotCookies = join(process.cwd(), '.cookies.txt');
  if (existsSync(dotCookies)) {
    try {
      return parseNetscapeCookies(readFileSync(dotCookies, 'utf8'));
    } catch {}
  }

  const cookiePath = getCookiePath();
  if (!existsSync(cookiePath)) return null;
  try {
    const content = readFileSync(cookiePath, 'utf8');
    const parsed = JSON.parse(content);
    if (typeof parsed.cookie_string === 'string' && parsed.cookie_string.length > 0) {
      return parsed.cookie_string;
    }
    return null;
  } catch {
    return null;
  }
}

export function deleteCookies(): boolean {
  const cookiePath = getCookiePath();
  if (!existsSync(cookiePath)) return false;
  try {
    unlinkSync(cookiePath);
    return true;
  } catch {
    return false;
  }
}

export function saveCookies(cookieString: string): void {
  const cookiePath = getCookiePath();
  const dir = dirname(cookiePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(cookiePath, JSON.stringify({ cookie_string: cookieString }, null, 2));
}

export interface CookieValidation {
  valid: boolean;
  present: string[];
  missing: string[];
}

export function validateCookies(cookieString: string): CookieValidation {
  const cookieNames = cookieString
    .split(';')
    .map(c => c.trim().split('=')[0]);

  const present: string[] = [];
  const missing: string[] = [];

  for (const required of DEFAULTS.auth.requiredCookies) {
    if (cookieNames.includes(required)) {
      present.push(required);
    } else {
      missing.push(required);
    }
  }

  return {
    valid: missing.length === 0,
    present,
    missing,
  };
}
