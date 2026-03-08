#!/usr/bin/env node
import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';

const db = new Database('./scanner.db', { readonly: true });

const coins = db.prepare(`
  SELECT symbol, name, address, chain, narrative, market_cap, liquidity, 
         volume_24h, score, result, source, scanned_at, updated_at
  FROM coins 
  ORDER BY score DESC, updated_at DESC
`).all();

const output = {
  generated_at: new Date().toISOString(),
  total_coins: coins.length,
  coins: coins
};

writeFileSync('./scanner.json', JSON.stringify(output, null, 2));
console.log(`✅ Exported ${coins.length} coins to scanner.json`);
