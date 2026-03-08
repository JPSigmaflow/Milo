#!/usr/bin/env node
/**
 * Daily Pump.fun Status Report
 * Pulls detailed data from DB (stored by store-daily-report.mjs)
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'pumpfun-tracker.db');

function generateReport() {
  const db = new Database(DB_PATH);
  const reportDate = new Date().toISOString().split('T')[0];
  
  // Try to get today's stored report
  const stored = db.prepare('SELECT * FROM daily_reports WHERE report_date = ?').get(reportDate);
  
  if (!stored) {
    console.error('⚠️ No stored report for ' + reportDate + ' - run store-daily-report.mjs first');
    db.close();
    return null;
  }
  
  const v1Top = JSON.parse(stored.v1_top_candidates);
  const v2Top = JSON.parse(stored.v2_top_candidates);
  const outcomes = JSON.parse(stored.outcomes_summary);
  
  // Build detailed message
  let msg = `📊 **Pump.fun Daily Status — ${new Date().toLocaleDateString('de-DE')}**\n\n`;
  
  msg += `**📈 Watchlist:**\n`;
  msg += `• ${stored.active_coins} aktive Coins\n`;
  msg += `• ${stored.new_coins_today} neue heute\n`;
  msg += `• ${stored.total_snapshots.toLocaleString()} Snapshots gesamt\n`;
  if (stored.last_snapshot_at) {
    const lastTime = new Date(stored.last_snapshot_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    msg += `• Letzter Snapshot: ${lastTime} Uhr\n`;
  }
  msg += `\n`;
  
  msg += `**🎯 v1.0 Top 5 (mit Details):**\n`;
  v1Top.slice(0, 5).forEach((c, i) => {
    msg += `${i+1}. **${c.symbol}** — Score ${c.score}/12\n`;
    const liq = c.liq ? `$${Math.round(c.liq/1000)}K` : 'N/A';
    const mc = c.mc ? `$${Math.round(c.mc/1000)}K` : 'N/A';
    const vol = c.vol ? `$${Math.round(c.vol/1000)}K` : 'N/A';
    msg += `   Liq: ${liq} | MC: ${mc} | Vol: ${vol}\n`;
    if (c.buys && c.sells) {
      msg += `   Buys: ${c.buys} | Sells: ${c.sells} | BSR: ${c.bsr}\n`;
    }
    if (c.url) msg += `   ${c.url}\n`;
  });
  msg += `\n`;
  
  msg += `**🔬 v2.0 Top 5 (Hard Filter Pass):**\n`;
  v2Top.slice(0, 5).forEach((c, i) => {
    const outcome = c.outcome ? ` ${c.outcome === 'exploder' ? '✅ Exploder' : c.outcome === 'mild_exploder' ? '✅ Mild' : ''}` : '';
    msg += `${i+1}. **${c.symbol}** — Score ${c.score}/7${outcome}\n`;
    const liq = `$${Math.round(c.liq/1000)}K`;
    const mc = `$${Math.round(c.mc/1000)}K`;
    const vol = c.vol ? `$${Math.round(c.vol/1000)}K` : 'N/A';
    msg += `   Liq: ${liq} | MC: ${mc} | Vol: ${vol} | BSR: ${c.bsr.toFixed(2)}\n`;
    msg += `   Buys: ${c.buys.toLocaleString()}\n`;
    
    // Show which scoring criteria passed
    const passed = [];
    if (c.scoreLiq25k) passed.push('Liq≥25K');
    if (c.scoreBuys500) passed.push('Buys≥500');
    if (c.scoreLiqMcRatio) passed.push('Liq/MC');
    if (c.scoreVolMcRatio) passed.push('Vol/MC');
    if (passed.length > 0) msg += `   ✓ ${passed.join(', ')}\n`;
    
    if (c.url) msg += `   ${c.url}\n`;
  });
  msg += `\n`;
  
  msg += `**📊 Outcomes:**\n`;
  const totalLabeled = outcomes.reduce((sum, o) => sum + o.count, 0);
  outcomes.forEach(o => {
    const emoji = o.outcome === 'exploder' ? '🚀' : o.outcome === 'mild_exploder' ? '📈' : o.outcome === 'normal' ? '➡️' : o.outcome === 'fail' ? '💀' : '🚨';
    const label = o.outcome.charAt(0).toUpperCase() + o.outcome.slice(1).replace('_', ' ');
    msg += `• ${emoji} ${label}: ${o.count} (${o.pct}%)\n`;
  });
  msg += `Total gelabelt: ${totalLabeled}\n`;
  msg += `\n`;
  
  msg += `**⚡ v2.0 Parallel-Test:**\n`;
  msg += `• Tag ${stored.v2_test_day} von 7\n`;
  msg += `• ${stored.v2_coins_passed} Coins passieren Hard Filter\n`;
  msg += `• Nächster Check: Dienstag 11.03.\n`;
  
  db.close();
  return msg;
}

// When run directly, print to console
if (import.meta.url === `file://${process.argv[1]}`) {
  const report = generateReport();
  if (report) console.log(report);
}

export { generateReport };
