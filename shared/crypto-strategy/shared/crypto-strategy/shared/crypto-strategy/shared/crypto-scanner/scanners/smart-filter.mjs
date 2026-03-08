// Smart Filter — extracts coin mentions from raw alerts, filters spam, scores relevance

// Known large-caps to ignore (we want small-caps <$50M)
const IGNORE_TICKERS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC',
  'LINK', 'UNI', 'SHIB', 'LTC', 'TRX', 'NEAR', 'APT', 'SUI', 'OP', 'ARB',
  'PEPE', 'WIF', 'BONK', 'FLOKI', 'MEME', 'USDT', 'USDC', 'DAI', 'BUSD',
  'TRUMP', 'USD', 'EUR', 'NFT', 'AI', 'DM', 'NEW', 'CEO', 'SEC', 'ETF',
  'IPO', 'FED', 'GDP', 'CPI', 'APY', 'TVL', 'ATH', 'ATL', 'ROI',
]);

// Spam patterns
const SPAM_PATTERNS = [
  /t\.me\/\w+/i,          // Telegram group links
  /DM.*to join/i,          // "DM to join" scams
  /alpha group/i,           // "alpha group" scams
  /100x pump/i,
  /guaranteed.*profit/i,
  /free.*airdrop/i,
  /click.*link/i,
  /limited.*time.*offer/i,
  /first month.*code/i,     // ads
  /Built on Core\. Designed/i, // specific ad
];

// AI/DePIN/Small-Cap narrative keywords (boost score)
const NARRATIVE_BOOST = [
  'AI agent', 'artificial intelligence', 'machine learning', 'DePIN',
  'decentralized compute', 'GPU network', 'inference', 'LLM',
  'on-chain AI', 'AI token', 'AI crypto', 'AI blockchain',
  'new listing', 'just listed', 'MEXC listing', 'Binance listing',
  'low cap gem', 'micro cap', 'under $50M',
  'RWA', 'real world asset', 'tokenization',
  'launchpad', 'IDO', 'presale',
];

export function filterAlerts(alerts) {
  const results = [];
  const tickerMentions = {}; // track how many times each ticker is mentioned

  for (const alert of alerts) {
    const text = alert.text || alert.title || '';
    
    // Skip spam
    if (SPAM_PATTERNS.some(p => p.test(text))) continue;
    
    // Extract $TICKER mentions
    const tickers = [...text.matchAll(/\$([A-Z]{2,10})\b/g)].map(m => m[1]);
    const validTickers = tickers.filter(t => !IGNORE_TICKERS.has(t));
    
    if (validTickers.length === 0) continue;
    
    // Check narrative fit
    const textLower = text.toLowerCase();
    const narrativeHits = NARRATIVE_BOOST.filter(kw => textLower.includes(kw.toLowerCase()));
    const narrativeScore = Math.min(narrativeHits.length * 10, 30);
    
    // Source quality score
    let sourceScore = 0;
    const src = alert.source || '';
    const handle = alert.handle || alert.user || '';
    if (['lookonchain', 'ZachXBT', 'EmberCN', 'ai_9684xtpa', 'Spot_On_Chain'].includes(handle)) sourceScore = 20;
    else if (['whale_alert', 'WatcherGuru', 'CoinDesk', 'Cointelegraph'].includes(handle)) sourceScore = 15;
    else if (src.includes('cryptopanic')) sourceScore = 10;
    else if (src.includes('telegram')) sourceScore = 10;
    else if (src.includes('reddit')) sourceScore = 5;
    
    for (const ticker of validTickers) {
      if (!tickerMentions[ticker]) {
        tickerMentions[ticker] = { count: 0, sources: new Set(), texts: [], bestScore: 0, narratives: [] };
      }
      const entry = tickerMentions[ticker];
      entry.count++;
      entry.sources.add(alert.source || 'unknown');
      if (entry.texts.length < 3) entry.texts.push(text.substring(0, 200));
      const score = sourceScore + narrativeScore + Math.min(entry.count * 5, 20);
      entry.bestScore = Math.max(entry.bestScore, score);
      if (narrativeHits.length > 0) entry.narratives.push(...narrativeHits);
    }
  }

  // Return coins mentioned 2+ times OR with high score
  const filtered = [];
  for (const [ticker, data] of Object.entries(tickerMentions)) {
    if (data.count >= 2 || data.bestScore >= 25) {
      filtered.push({
        symbol: ticker,
        mentions: data.count,
        sources: [...data.sources],
        score: data.bestScore,
        narratives: [...new Set(data.narratives)],
        sampleTexts: data.texts,
      });
    }
  }

  return filtered.sort((a, b) => b.score - a.score || b.mentions - a.mentions);
}

// Run standalone
if (process.argv[1] && process.argv[1].includes('smart-filter')) {
  const { readFileSync, existsSync } = await import('fs');
  const alertFile = process.argv[2] || '/Users/milo/.openclaw/workspace/shared/crypto-scanner/data/pending-alerts.json';
  if (existsSync(alertFile)) {
    const alerts = JSON.parse(readFileSync(alertFile, 'utf8'));
    console.log(`Filtering ${alerts.length} alerts...`);
    const results = filterAlerts(alerts);
    console.log(`\n${results.length} coins found:\n`);
    for (const r of results) {
      console.log(`$${r.symbol} — Score: ${r.score} | Mentions: ${r.mentions} | Sources: ${r.sources.join(', ')}`);
      if (r.narratives.length) console.log(`  Narratives: ${r.narratives.join(', ')}`);
      console.log(`  Sample: ${r.sampleTexts[0]?.substring(0, 120)}`);
      console.log();
    }
  }
}
