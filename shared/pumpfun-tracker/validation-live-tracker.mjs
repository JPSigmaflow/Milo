#!/usr/bin/env node
/**
 * Validation Live Tracker
 * 
 * Tracks all MEXC listings and cross-references with our watchlist.
 * Calculates Precision, Recall, Lead Time.
 */

import https from 'https';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getDb, initSchema } from './tracker-core.mjs';

const STATS_FILE = '/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/validation-stats.json';
const LESSONS_FILE = '/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/validation-lessons.md';

function loadStats() {
  if (!existsSync(STATS_FILE)) {
    return {
      startDate: new Date().toISOString().split('T')[0],
      mexcListings: [],
      ourAlerts: [],
      hits: [],
      misses: [],
      falsePositives: []
    };
  }
  return JSON.parse(readFileSync(STATS_FILE, 'utf8'));
}

function saveStats(stats) {
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// Fetch MEXC new listings (simplified - would need proper scraping)
async function fetchMEXCListings() {
  // In production: scrape https://www.mexc.com/announcements/new-listings
  // For now: return empty (manual input needed)
  return [];
}

async function run() {
  console.log('📊 VALIDATION LIVE TRACKER\n');
  
  const db = getDb();
  initSchema(db);
  const stats = loadStats();
  
  // 1. Get all our high-score alerts
  const ourAlerts = db.prepare(`
    SELECT token_name, symbol, token_address, score, added_at, added_by
    FROM watchlist_coins
    WHERE score >= 8
    AND added_at > datetime('now', '-30 days')
    ORDER BY score DESC
  `).all();
  
  console.log(`Our Alerts (last 30 days, Score >= 8): ${ourAlerts.length}\n`);
  
  // 2. Manual MEXC listing check (would be automated with scraper)
  console.log('Manual Step: Check MEXC announcements for these symbols:\n');
  ourAlerts.forEach(a => {
    console.log(`  ${a.symbol.padEnd(10)} | ${a.token_name.slice(0, 30).padEnd(30)} | Score ${a.score}/12`);
  });
  
  console.log('\n---\n');
  console.log('To update validation stats manually:');
  console.log('1. Check https://www.mexc.com/announcements/new-listings');
  console.log('2. For each Solana token listed in last 30 days:');
  console.log('   - Search symbol in our list above');
  console.log('   - If found: HIT');
  console.log('   - If not found: MISS');
  console.log('3. Run: node validation-update.mjs --add-hit SYMBOL --listing-date YYYY-MM-DD');
  
  // 3. Calculate current metrics
  const hits = stats.hits.length;
  const misses = stats.misses.length;
  const totalMEXC = hits + misses;
  const totalAlerts = ourAlerts.length;
  const falsePositives = stats.falsePositives.length;
  
  const precision = totalAlerts > 0 ? (hits / totalAlerts * 100).toFixed(1) : 0;
  const recall = totalMEXC > 0 ? (hits / totalMEXC * 100).toFixed(1) : 0;
  
  console.log('\n📈 CURRENT METRICS\n');
  console.log(`Period: ${stats.startDate} to today`);
  console.log(`MEXC Listings (Solana): ${totalMEXC}`);
  console.log(`Our Alerts (Score >=8): ${totalAlerts}`);
  console.log(`Hits (we had it): ${hits}`);
  console.log(`Misses (we didn't): ${misses}`);
  console.log(`False Positives: ${falsePositives}`);
  console.log(`\nPrecision: ${precision}% (how many of our alerts got listed)`);
  console.log(`Recall: ${recall}% (how many MEXC listings did we catch)`);
  
  if (stats.hits.length > 0) {
    const leadTimes = stats.hits.map(h => h.leadTimeDays).filter(t => t != null);
    const avgLeadTime = leadTimes.length > 0 
      ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1)
      : 'N/A';
    console.log(`Avg Lead Time: ${avgLeadTime} days`);
  }
  
  // 4. Export for dashboard
  const dashboardData = {
    updated: new Date().toISOString(),
    period: `${stats.startDate} to ${new Date().toISOString().split('T')[0]}`,
    metrics: {
      precision: parseFloat(precision),
      recall: parseFloat(recall),
      hits,
      misses,
      falsePositives,
      totalAlerts,
      totalMEXC
    },
    recentHits: stats.hits.slice(-5),
    recentMisses: stats.misses.slice(-5)
  };
  
  writeFileSync(
    '/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/validation-dashboard-data.json',
    JSON.stringify(dashboardData, null, 2)
  );
  
  console.log('\n✅ Dashboard data updated: validation-dashboard-data.json');
  
  db.close();
}

run();
