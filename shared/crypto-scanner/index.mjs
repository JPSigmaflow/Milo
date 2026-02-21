import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
if (!existsSync(join(__dirname, 'data'))) mkdirSync(join(__dirname, 'data'));

// Import scanners
const { scanReddit } = await import('./scanners/reddit.js');
const { scanDexScreener } = await import('./scanners/dexscreener.js');

import { filterAlerts } from './scanners/smart-filter.mjs';

let scanX = null;
try {
  const xMod = await import('./scanners/x-syndication.mjs');
  scanX = xMod.scanX;
  console.log('[INIT] X Scanner loaded (syndication API - no cookies needed)');
} catch(e) {
  console.log('[INIT] X Scanner not available:', e.message);
}

const ALERT_FILE = join(__dirname, 'data', 'pending-alerts.json');
const SCANNER_DB = '/Users/milo/.openclaw/workspace/shared/crypto-strategy/scanner.db';
const CONFIG = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'));

// Save to scanner.db — extract coin info from alert and upsert
function saveToDB(alert) {
  try {
    const symbol = alert.symbol || alert.baseToken?.symbol || extractSymbol(alert.text || alert.title || '') || null;
    const name = alert.name || alert.baseToken?.name || alert.title || symbol || 'Unknown';
    const address = alert.address || alert.baseToken?.address || extractAddress(alert.text || '') || null;
    const chain = alert.chain || alert.chainId || null;
    const source = alert.source || 'unknown';
    const score = alert.score || 0;
    const narrative = alert.keywords?.join(', ') || alert.narrative || null;
    const mcap = alert.marketCap || alert.fdv || null;
    const liq = alert.liquidity || null;
    const vol = alert.volume24h || null;

    if (!symbol || symbol.length > 20) return; // skip garbage

    // Check if coin already exists in scanner.db
    const existing = execSync(
      `sqlite3 "${SCANNER_DB}" "SELECT id FROM coins WHERE UPPER(symbol)=UPPER('${esc(symbol)}') LIMIT 1;"`,
      { timeout: 5000 }
    ).toString().trim();

    const channel = alert.channel || alert.subreddit || alert.query || '';
    const sourceDetail = channel ? `${source}:@${channel}` : source;
    
    if (existing) {
      // Update score if higher, update timestamp, append source detail
      execSync(`sqlite3 "${SCANNER_DB}" "UPDATE coins SET score=MAX(score,${score}), updated_at=datetime('now'), source=source||', ${esc(source)}', source_channels=COALESCE(source_channels,'')||' ${esc(sourceDetail)}' WHERE id=${existing};"`, { timeout: 5000 });
      console.log(`[DB] Updated ${symbol} (score: ${score}, source: ${sourceDetail})`);
    } else {
      // Also check portfolio.db to avoid duplicates (DB Pipeline Rule)
      const inPortfolio = execSync(
        `sqlite3 "/Users/milo/.openclaw/workspace/shared/portfolio.db" "SELECT symbol FROM holdings WHERE UPPER(symbol)=UPPER('${esc(symbol)}') LIMIT 1;"`,
        { timeout: 5000 }
      ).toString().trim();
      
      if (inPortfolio) {
        console.log(`[DB] ${symbol} already in portfolio.db — skipping`);
        return;
      }

      execSync(`sqlite3 "${SCANNER_DB}" "INSERT INTO coins (symbol, name, address, chain, narrative, market_cap, liquidity, volume_24h, score, result, source, source_channels) VALUES ('${esc(symbol)}', '${esc(name)}', '${esc(address)}', '${esc(chain)}', '${esc(narrative)}', ${mcap || 'NULL'}, ${liq || 'NULL'}, ${vol || 'NULL'}, ${score}, 'deep-dive', '${esc(source)}', '${esc(sourceDetail)}');"`, { timeout: 5000 });
      console.log(`[DB] NEW coin saved: ${symbol} (score: ${score}, source: ${source})`);
    }
  } catch(e) {
    console.log(`[DB] Error saving: ${e.message?.substring(0, 80)}`);
  }
}

function esc(s) { return s ? String(s).replace(/'/g, "''") : ''; }

function extractSymbol(text) {
  // Match $SYMBOL or common patterns
  const m = text.match(/\$([A-Z]{2,10})\b/);
  return m ? m[1] : null;
}

function extractAddress(text) {
  // Match Solana (base58) or EVM (0x...) addresses
  const evm = text.match(/0x[a-fA-F0-9]{40}/);
  if (evm) return evm[0];
  const sol = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  return sol ? sol[0] : null;
}

function saveAlert(alert) {
  const alerts = existsSync(ALERT_FILE) ? JSON.parse(readFileSync(ALERT_FILE, 'utf8')) : [];
  alerts.push({ ...alert, timestamp: new Date().toISOString() });
  writeFileSync(ALERT_FILE, JSON.stringify(alerts.slice(-500), null, 2));
  
  // Scanner speichert NUR in pending-alerts.json (roh/unstrukturiert)
  // ANALYST (alle 4h) analysiert per AI und schreibt strukturiert in scanner.db
}

async function runCycle() {
  console.log(`\n[${new Date().toISOString()}] === Scan Cycle ===`);
  
  // Reddit
  try {
    const redditResults = await scanReddit();
    for (const r of redditResults) {
      if (r.score >= 7) saveAlert({ ...r, source: 'reddit' });
    }
  } catch(e) { console.log('[Reddit] Error:', e.message); }

  // DexScreener
  try {
    const dexResults = await scanDexScreener();
    for (const r of dexResults) {
      if (r.score >= 7) saveAlert({ ...r, source: 'dexscreener' });
    }
  } catch(e) { console.log('[DexScreener] Error:', e.message); }

  // YouTube
  try {
    const { scanYouTube } = await import('./scanners/youtube.js');
    const ytResults = await scanYouTube();
    for (const r of ytResults) {
      saveAlert({ ...r, source: 'youtube' });
    }
  } catch(e) { console.log('[YouTube] Error:', e.message); }

  // CoinGecko Trending
  try {
    const { scanCoinGeckoTrending } = await import('./scanners/coingecko-trending.js');
    const cgResults = await scanCoinGeckoTrending();
    for (const r of cgResults) {
      saveAlert({ ...r, source: 'coingecko-trending' });
    }
  } catch(e) { console.log('[CoinGecko] Error:', e.message); }

  // CryptoPanic
  try {
    const { scanCryptoPanic } = await import('./scanners/cryptopanic.js');
    const cpResults = await scanCryptoPanic();
    for (const r of cpResults) {
      saveAlert({ ...r, source: 'cryptopanic' });
    }
  } catch(e) { console.log('[CryptoPanic] Error:', e.message); }

  // Pump.fun
  try {
    const { scanPumpFun } = await import('./scanners/pumpfun.js');
    const pumpResults = await scanPumpFun();
    for (const r of pumpResults) {
      saveAlert({ ...r, source: 'pumpfun' });
    }
  } catch(e) { console.log('[PumpFun] Error:', e.message); }

  // Telegram Channels (every 2nd cycle)
  if (cycle % 2 === 0) {
    try {
      const { scanTelegram } = await import('./scanners/telegram.js');
      const tgResults = await scanTelegram();
      for (const r of tgResults) {
        saveAlert({ ...r, source: 'telegram' });
      }
    } catch(e) { console.log('[Telegram] Error:', e.message); }
  }

  // X Scanner (every 3rd cycle = ~15min)
  if (scanX && cycle % 3 === 0) {
    try {
      const xResults = await scanX();
      for (const r of xResults) {
        saveAlert({ ...r, source: 'x-twitter' });
      }
    } catch(e) { console.log('[X] Error:', e.message); }
  }
}

let cycle = 0;
console.log('[SCANNER] Starting daemon — Reddit + DexScreener + X');
console.log('[SCANNER] Reddit: every 5min | DexScreener: every 5min | X: every 15min');

async function loop() {
  while (true) {
    try {
      await runCycle();
      cycle++;
    } catch(e) {
      console.log('[ERROR]', e.message);
    }
    // Smart Filter — analyze pending alerts for real coin signals
    try {
      const rawAlerts = existsSync(ALERT_FILE) ? JSON.parse(readFileSync(ALERT_FILE, 'utf8')) : [];
      const filtered = filterAlerts(rawAlerts);
      if (filtered.length > 0) {
        console.log(`[FILTER] ${filtered.length} coins detected from ${rawAlerts.length} alerts:`);
        for (const f of filtered.slice(0, 10)) {
          console.log(`  $${f.symbol} — Score: ${f.score} | Mentions: ${f.mentions} | Sources: ${f.sources.join(', ')}`);
          if (f.narratives.length) console.log(`    Narratives: ${f.narratives.join(', ')}`);
        }
        // Save filtered results
        writeFileSync(join(__dirname, 'data', 'filtered-signals.json'), JSON.stringify(filtered, null, 2));
      } else {
        console.log(`[FILTER] 0 coins from ${rawAlerts.length} alerts (all spam/irrelevant)`);
      }
    } catch(e) { console.log('[FILTER] Error:', e.message?.substring(0, 80)); }

    // Export data for dashboard after each cycle
    try {
      execSync('bash /Users/milo/.openclaw/workspace/shared/crypto-dashboard/export-data.sh', { timeout: 30000 });
    } catch(e) { console.log('[Export] Error:', e.message?.substring(0, 60)); }
    
    await new Promise(r => setTimeout(r, 5 * 60 * 1000)); // 5 min
  }
}

loop();
