import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ALERTS_FILE = join(ROOT, 'data', 'pending-alerts.json');

export function queueAlert(match) {
  const alerts = JSON.parse(readFileSync(ALERTS_FILE, 'utf8'));
  alerts.push({
    timestamp: new Date().toISOString(),
    score: match.score,
    type: 'viral_match',
    title: `${match.token.name} ($${match.token.symbol})`,
    source: `Reddit r/${match.post.subreddit} - ${(match.post.ups/1000).toFixed(0)}k upvotes`,
    token: {
      name: match.token.name,
      symbol: match.token.symbol,
      address: match.token.address,
      mc: match.token.marketCap,
      lp: match.token.liquidity,
      url: match.token.url
    },
    keywords: match.matchedKeywords,
    message: match.message
  });
  writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
  console.log(`[Alert] Queued: $${match.token.symbol} (Score: ${match.score})`);
}
