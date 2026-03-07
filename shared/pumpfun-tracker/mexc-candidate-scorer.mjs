#!/usr/bin/env node
/**
 * MEXC Listing Candidate Scorer
 * 
 * Analyzes all watchlist coins and scores their likelihood of getting listed on MEXC.
 * Based on the 我的刀盾 case study pattern.
 */

import { getDb, initSchema } from './tracker-core.mjs';

function getMEXCListingScore(coin) {
  let score = 0;
  const factors = [];
  
  // 1. Is it a Pump.fun token? +2
  if (coin.chain === 'solana' && (coin.category === 'meme' || coin.category === 'tech')) {
    score += 2;
    factors.push('Pump.fun ecosystem');
  }
  
  // 2. Age (3-7 days sweet spot) +2
  const daysOld = (Date.now() - new Date(coin.added_at).getTime()) / 86400000;
  if (daysOld >= 3 && daysOld <= 7) {
    score += 2;
    factors.push(`Age: ${daysOld.toFixed(1)} days (sweet spot)`);
  } else if (daysOld >= 7 && daysOld <= 14) {
    score += 1;
    factors.push(`Age: ${daysOld.toFixed(1)} days (still relevant)`);
  }
  
  // 3. Market Cap ($500K-$5M optimal) +1
  const mc = coin.current_mc || coin.mc_at_add || 0;
  if (mc >= 500000 && mc <= 5000000) {
    score += 1;
    factors.push(`MC: $${(mc/1e6).toFixed(2)}M (MEXC range)`);
  }
  
  // 4. Volume/MC ratio (>1x = active) +2
  // We don't have current volume in DB, would need to fetch
  // For now, assume if coin is in 'active' status it has good volume
  if (coin.status === 'active' || coin.status === 'hot') {
    score += 1;
    factors.push('Active trading status');
  }
  
  // 5. V2 Score >= 8 (proven quality) +1
  if (coin.v2_score >= 8) {
    score += 1;
    factors.push(`High V2 quality: ${coin.v2_score}/12`);
  }
  
  // 6. Asia narrative (Chinese characters, BiliBili mentions) +2
  const hasChinese = /[\u4e00-\u9fa5]/.test(coin.token_name + coin.symbol);
  if (hasChinese) {
    score += 2;
    factors.push('Chinese characters (Asia relevant)');
  }
  
  // 7. Category bonus
  if (coin.category === 'meme') {
    score += 1;
    factors.push('Meme category (MEXC priority)');
  } else if (coin.category === 'tech') {
    score += 2;
    factors.push('Tech category (MEXC loves tech innovation)');
  }
  
  // 8. Tech narratives (AI, ZK, DePIN, RWA) +1
  const techNarratives = ['ai', 'agent', 'zk', 'depin', 'rwa', 'infrastructure', 'oracle', 'bridge'];
  const name = (coin.token_name || '').toLowerCase();
  const hasStrongTechNarrative = techNarratives.some(n => name.includes(n));
  if (hasStrongTechNarrative) {
    score += 1;
    factors.push('Strong tech narrative (AI/ZK/DePIN/RWA)');
  }
  
  return { score, factors };
}

async function run() {
  const db = getDb();
  initSchema(db);
  
  // Get all active coins with V2 scores
  const coins = db.prepare(`
    SELECT w.*, v2.score_total as v2_score
    FROM watchlist_coins w
    LEFT JOIN criteria_v2_scores v2 ON w.id = v2.coin_id
    WHERE w.status IN ('active', 'hot')
    ORDER BY v2.score_total DESC
  `).all();
  
  console.log('🏦 MEXC LISTING CANDIDATE ANALYSIS\n');
  console.log(`Analyzing ${coins.length} active coins...\n`);
  
  const candidates = [];
  
  for (const coin of coins) {
    const analysis = getMEXCListingScore(coin);
    
    if (analysis.score >= 5) {
      candidates.push({
        coin,
        ...analysis
      });
    }
  }
  
  // Sort by score
  candidates.sort((a, b) => b.score - a.score);
  
  // Display results
  if (candidates.length === 0) {
    console.log('No strong MEXC candidates found.');
    db.close();
    return;
  }
  
  console.log(`\n🎯 MEXC LISTING CANDIDATES (Score >= 5)\n`);
  console.log('Score | Symbol | Name | MC | Age | Factors');
  console.log('------|--------|------|----|----|--------');
  
  for (const c of candidates) {
    const mc = c.coin.current_mc || c.coin.mc_at_add || 0;
    const daysOld = (Date.now() - new Date(c.coin.added_at).getTime()) / 86400000;
    
    console.log(`${c.score}/11 | ${c.coin.symbol.padEnd(6)} | ${c.coin.token_name.slice(0,20).padEnd(20)} | $${(mc/1e6).toFixed(2)}M | ${daysOld.toFixed(1)}d | ${c.factors.length} signals`);
  }
  
  // High-priority alerts
  const highPriority = candidates.filter(c => c.score >= 8);
  if (highPriority.length > 0) {
    console.log('\n🚨 HIGH PROBABILITY (Score >= 8):\n');
    for (const c of highPriority) {
      console.log(`${c.coin.symbol} (${c.coin.token_name})`);
      console.log(`  Score: ${c.score}/11`);
      console.log(`  Factors:`);
      c.factors.forEach(f => console.log(`    - ${f}`));
      console.log('');
    }
  }
  
  // Save to file for dashboard/alerts
  const output = {
    timestamp: new Date().toISOString(),
    totalAnalyzed: coins.length,
    candidates: candidates.map(c => ({
      symbol: c.coin.symbol,
      name: c.coin.token_name,
      score: c.score,
      factors: c.factors,
      mc: c.coin.current_mc || c.coin.mc_at_add,
      daysOld: (Date.now() - new Date(c.coin.added_at).getTime()) / 86400000
    }))
  };
  
  const fs = await import('fs');
  fs.writeFileSync(
    '/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/mexc-candidates.json',
    JSON.stringify(output, null, 2)
  );
  
  console.log(`\n✅ Results saved to mexc-candidates.json`);
  
  db.close();
}

run();
