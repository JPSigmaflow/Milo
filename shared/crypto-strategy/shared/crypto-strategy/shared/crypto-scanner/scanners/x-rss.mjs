// X Scanner via multiple public sources (no login needed)
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 1. Nitter RSS feeds (multiple mirrors)
const NITTER_HOSTS = ['nitter.privacydev.net', 'nitter.poast.org', 'nitter.net'];

// Top crypto KOLs to monitor
const PROFILES = [
  'MustStopMurad', 'CryptoKaleo', 'blknoiz06', 'DegenSpartan',
  'MoonOverlord', 'inversebrah', 'CryptoGodJohn', 'AltcoinSherpa',
  'TheCryptoDog', 'Rewkang', 'HsakaTrades', 'ColdBloodShill',
  'AngeloBTC', 'CryptoTony__', 'lookonchain', 'whale_alert',
  'ZachXBT', 'coaboratory', 'ansabordo', 'Crypt0Savage',
];

// 2. Google News RSS for crypto trending
const GOOGLE_FEEDS = [
  'https://news.google.com/rss/search?q=memecoin+viral+launched&hl=en&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=solana+token+pump&hl=en&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=crypto+meme+exploding&hl=en&gl=US&ceid=US:en',
];

// 3. CryptoPanic free API (no key for basic)
const CRYPTOPANIC_URL = 'https://cryptopanic.com/api/free/v1/posts/?auth_token=free&public=true&kind=news&filter=hot';

async function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { 
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    clearTimeout(t);
    return r;
  } catch(e) {
    clearTimeout(t);
    return null;
  }
}

async function scanGoogleNews() {
  const results = [];
  for (const feedUrl of GOOGLE_FEEDS) {
    try {
      const r = await fetchWithTimeout(feedUrl);
      if (!r || !r.ok) continue;
      const xml = await r.text();
      // Extract titles from RSS
      const titles = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map(m => m[1]);
      const altTitles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].map(m => m[1]);
      const all = [...titles, ...altTitles].filter(t => t.length > 10 && t !== 'Google News');
      for (const title of all.slice(0, 10)) {
        results.push({ source: 'google-news', text: title, time: new Date().toISOString() });
      }
      console.log(`[X-Alt] Google News: ${all.length} articles`);
    } catch(e) {
      console.log(`[X-Alt] Google News error: ${e.message}`);
    }
  }
  return results;
}

async function scanCryptoPanic() {
  const results = [];
  try {
    const r = await fetchWithTimeout('https://cryptopanic.com/api/free/v1/posts/?public=true&kind=news&filter=hot');
    if (r && r.ok) {
      const data = await r.json();
      for (const post of (data.results || []).slice(0, 20)) {
        results.push({
          source: 'cryptopanic',
          text: post.title,
          url: post.url,
          votes: post.votes?.positive || 0,
          time: post.published_at
        });
      }
      console.log(`[X-Alt] CryptoPanic: ${results.length} hot posts`);
    }
  } catch(e) {
    console.log(`[X-Alt] CryptoPanic error: ${e.message}`);
  }
  return results;
}

// Trending on Reddit crypto subs (supplement)
async function scanRedditCrypto() {
  const results = [];
  const subs = ['cryptocurrency', 'altcoins', 'memecoin', 'solana', 'defi', 'pumpfun'];
  for (const sub of subs) {
    try {
      const r = await fetchWithTimeout(`https://www.reddit.com/r/${sub}/hot.json?limit=25`);
      if (!r || !r.ok) continue;
      const data = await r.json();
      const posts = data?.data?.children || [];
      for (const {data: p} of posts) {
        if (p.ups < 50) continue;
        results.push({
          source: `reddit-${sub}`,
          text: p.title,
          ups: p.ups,
          url: `https://reddit.com${p.permalink}`,
          time: new Date(p.created_utc * 1000).toISOString()
        });
      }
      console.log(`[X-Alt] r/${sub}: ${posts.length} posts`);
    } catch(e) {}
  }
  return results;
}

export async function scanXAlternative() {
  console.log('[X-Alt] Scanning alternative sources (no X API needed)...');
  const [google, panic, reddit] = await Promise.all([
    scanGoogleNews(),
    scanCryptoPanic(),
    scanRedditCrypto()
  ]);
  
  const all = [...google, ...panic, ...reddit];
  console.log(`[X-Alt] Total: ${all.length} items from alternative sources`);
  return all;
}

// Standalone test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await scanXAlternative();
  console.log(`\nTop items:`);
  r.slice(0, 10).forEach(i => console.log(`  [${i.source}] ${i.text?.substring(0, 100)}`));
}
