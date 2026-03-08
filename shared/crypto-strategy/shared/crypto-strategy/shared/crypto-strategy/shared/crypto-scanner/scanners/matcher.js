import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const loadJSON = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const saveJSON = (f, d) => writeFileSync(join(ROOT, f), JSON.stringify(d, null, 2));

const keywords = loadJSON('data/keywords.json');
const allKeywords = Object.values(keywords).flat();

function extractKeywords(text) {
  const lower = text.toLowerCase();
  return allKeywords.filter(kw => lower.includes(kw.toLowerCase()));
}

function calculateScore(post, token, matchedKeywords) {
  let score = 0;
  
  // Engagement score (0-3)
  if (post.ups > 50000) score += 3;
  else if (post.ups > 10000) score += 2;
  else if (post.ups > 1000) score += 1;
  
  // Keyword match strength (0-2)
  if (matchedKeywords.length >= 3) score += 2;
  else if (matchedKeywords.length >= 1) score += 1;
  
  // Token freshness (0-2)
  if (token.ageHours < 2) score += 2;
  else if (token.ageHours < 6) score += 1;
  
  // Liquidity (0-1)
  if (token.liquidity > 50000) score += 1;
  
  // Price action (0-2)
  if (token.priceChange24h > 500) score += 2;
  else if (token.priceChange24h > 100) score += 1;
  
  return Math.min(score, 10);
}

function formatAlert(match) {
  const { post, token, score, matchedKeywords } = match;
  const mcStr = token.marketCap > 1000000 ? `$${(token.marketCap/1000000).toFixed(1)}M` : `$${(token.marketCap/1000).toFixed(0)}k`;
  const lpStr = `$${(token.liquidity/1000).toFixed(0)}k`;
  const pChange = token.priceChange24h > 0 ? `+${token.priceChange24h}%` : `${token.priceChange24h}%`;
  const rec = score >= 8 ? 'Kaufen' : 'Beobachten';
  
  return `🔴 SIGNAL — Score: ${score}/10

📡 Quelle: Reddit r/${post.subreddit} (${(post.ups/1000).toFixed(0)}k Upvotes)
🪙 Token: $${token.symbol} (${token.name})
💰 MC: ${mcStr} | LP: ${lpStr}
📈 ${pChange} in 24h

🧠 Match: "${post.title.slice(0, 50)}" → Token ${token.symbol}
🔑 Keywords: ${matchedKeywords.join(', ')}
💡 Empfehlung: ${rec}

🔗 ${token.url}`;
}

export function matchViralTokens(redditPosts, dexTokens) {
  const seen = loadJSON('data/seen.json');
  const seenAlerts = new Set(seen.alerts || []);
  const matches = [];

  console.log(`[Matcher] Matching ${redditPosts.length} posts against ${dexTokens.length} tokens...`);

  for (const token of dexTokens) {
    const tokenText = `${token.name} ${token.symbol}`.toLowerCase();
    
    for (const post of redditPosts) {
      const postText = `${post.title} ${post.subreddit}`.toLowerCase();
      
      // Find keyword overlap
      const postKW = extractKeywords(postText);
      const tokenKW = extractKeywords(tokenText);
      const overlap = postKW.filter(kw => tokenKW.includes(kw));
      
      // Also check if token name/symbol appears in post or vice versa
      const nameInPost = postText.includes(token.symbol.toLowerCase()) || postText.includes(token.name.toLowerCase());
      const postWordInToken = post.title.toLowerCase().split(/\s+/).some(w => w.length > 3 && tokenText.includes(w));
      
      const matchedKeywords = [...new Set([...overlap, ...(nameInPost ? [token.symbol] : []), ...(postWordInToken ? ['title-match'] : [])])];
      
      if (matchedKeywords.length === 0) continue;
      
      const score = calculateScore(post, token, matchedKeywords);
      const alertKey = `${post.id}-${token.address}`;
      
      if (seenAlerts.has(alertKey)) continue;
      
      const match = { post, token, score, matchedKeywords, alertKey };
      match.message = formatAlert(match);
      matches.push(match);
      seenAlerts.add(alertKey);
    }
  }

  // Save seen alerts
  seen.alerts = [...seenAlerts].slice(-5000);
  saveJSON('data/seen.json', seen);
  
  // Save scores
  const scores = loadJSON('data/scores.json');
  for (const m of matches) {
    scores.push({
      timestamp: new Date().toISOString(),
      score: m.score,
      token: m.token.symbol,
      post: m.post.title.slice(0, 80),
      keywords: m.matchedKeywords
    });
  }
  saveJSON('data/scores.json', scores.slice(-1000));
  
  matches.sort((a, b) => b.score - a.score);
  console.log(`[Matcher] ${matches.length} matches found`);
  matches.filter(m => m.score >= 5).forEach(m => 
    console.log(`  ${m.score >= 7 ? '🔴' : '🟡'} Score ${m.score}: $${m.token.symbol} ↔ r/${m.post.subreddit} [${m.matchedKeywords.join(',')}]`)
  );
  
  return matches;
}

// Direct test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Test with mock data
  const mockPosts = [
    { id: 'test1', subreddit: 'cats', title: 'This cat is insane viral', ups: 32000, comments: 1500, ageHours: 2, engagement: 33500 },
    { id: 'test2', subreddit: 'memes', title: 'Elon Musk just tweeted about doge again', ups: 15000, comments: 800, ageHours: 1, engagement: 15800 },
  ];
  const mockTokens = [
    { address: 'abc', name: 'Cat Viral', symbol: 'CATV', liquidity: 25000, marketCap: 150000, priceChange24h: 340, ageHours: 3, volume24h: 80000, url: 'https://dexscreener.com/test' },
    { address: 'def', name: 'Doge Moon', symbol: 'DOGE2', liquidity: 60000, marketCap: 500000, priceChange24h: 120, ageHours: 5, volume24h: 200000, url: 'https://dexscreener.com/test2' },
  ];
  
  console.log('[Matcher] Running with mock data...\n');
  const results = matchViralTokens(mockPosts, mockTokens);
  console.log('\n--- Alerts (score >= 7) ---');
  results.filter(m => m.score >= 7).forEach(m => console.log(m.message + '\n'));
  if (results.filter(m => m.score >= 7).length === 0) console.log('(none above threshold)');
}
