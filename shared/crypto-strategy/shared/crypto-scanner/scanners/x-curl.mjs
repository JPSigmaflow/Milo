import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NITTER = 'https://nitter.tiekoetter.com';

const PROFILES = [
  'lookonchain', 'whale_alert', 'MustStopMurad', 'CryptoKaleo',
  'blknoiz06', 'DegenSpartan', 'inversebrah', 'CryptoGodJohn',
  'AltcoinSherpa', 'TheCryptoDog', 'Rewkang', 'HsakaTrades',
  'ColdBloodShill', 'AngeloBTC', 'SmartContracter', 'ZachXBT',
  'GCRClassic', 'cobie', 'MacnBTC', 'cb_doge',
];

function fetchViacurl(handle) {
  try {
    const html = execSync(
      `curl -sL "${NITTER}/${handle}" --max-time 8 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    // Extract tweets
    const re = /tweet-content media-body[^>]*>([\s\S]*?)<\/div>/g;
    const tweets = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      const clean = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length > 20) tweets.push(clean);
    }
    return tweets.slice(0, 5);
  } catch(e) {
    return [];
  }
}

export async function scanXProfiles() {
  console.log(`[X] Scanning ${PROFILES.length} crypto KOLs via Nitter...`);
  const seenFile = join(ROOT, 'data', 'seen-x.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { hashes: [] };
  const seenSet = new Set(seen.hashes);
  const results = [];

  for (const handle of PROFILES) {
    const tweets = fetchViacurl(handle);
    for (const t of tweets) {
      const hash = t.substring(0, 80);
      if (seenSet.has(hash)) continue;
      seenSet.add(hash);
      results.push({ source: `x-${handle}`, handle, text: t, time: new Date().toISOString() });
    }
    if (tweets.length > 0) console.log(`[X] @${handle}: ${tweets.length} tweets`);
    // Rate limit: 2s between requests  
    await new Promise(r => setTimeout(r, 2000));
  }

  seen.hashes = [...seenSet].slice(-5000);
  writeFileSync(seenFile, JSON.stringify(seen));
  console.log(`[X] Done. ${results.length} new tweets.`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await scanXProfiles();
  r.slice(0, 10).forEach(t => console.log(`  [@${t.handle}] ${t.text.substring(0, 120)}`));
}
