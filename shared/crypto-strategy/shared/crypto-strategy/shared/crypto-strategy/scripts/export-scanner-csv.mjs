import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../scanner.db');
const csvPath = join(__dirname, '../scanner.csv');

const db = new Database(dbPath, { readonly: true });

const rows = db.prepare(`
  SELECT symbol, name, chain, narrative, market_cap, liquidity, volume_24h, score, result, source, scanned_at
  FROM coins
  ORDER BY scanned_at DESC
`).all();

const csv = [
  'symbol,name,chain,narrative,market_cap,liquidity,volume_24h,score,result,source,scanned_at',
  ...rows.map(r => 
    `"${r.symbol}","${r.name}","${r.chain || ''}","${r.narrative || ''}",${r.market_cap || 0},${r.liquidity || 0},${r.volume_24h || 0},${r.score || 0},"${r.result || ''}","${r.source || ''}","${r.scanned_at || ''}"`
  )
].join('\n');

writeFileSync(csvPath, csv);
console.log(`Exported ${rows.length} rows to scanner.csv`);
