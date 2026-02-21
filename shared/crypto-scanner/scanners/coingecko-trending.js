import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export async function scanCoinGeckoTrending() {
  const seenFile = join(ROOT, 'data', 'seen-cg.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { ids: [] };
  const seenSet = new Set(seen.ids);
  const results = [];

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) { console.log(`[CG] HTTP ${res.status}`); return results; }
    const data = await res.json();

    for (const { item } of (data.coins || [])) {
      if (seenSet.has(item.id)) continue;
      seenSet.add(item.id);
      results.push({
        source: 'coingecko-trending',
        name: item.name,
        symbol: item.symbol,
        id: item.id,
        marketCapRank: item.market_cap_rank,
        thumb: item.thumb,
        score: item.score,
        time: new Date().toISOString(),
      });
    }
    console.log(`[CG] Trending: ${data.coins?.length || 0} coins, ${results.length} new`);
  } catch(e) {
    console.log(`[CG] Error: ${e.message}`);
  }

  seen.ids = [...seenSet].slice(-5000);
  writeFileSync(seenFile, JSON.stringify(seen));
  return results;
}
