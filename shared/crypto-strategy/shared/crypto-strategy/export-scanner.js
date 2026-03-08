#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'scanner.db');
const outputPath = path.join(__dirname, 'scanner-coins.json');

console.log('📊 Exporting scanner.db → scanner-coins.json...');

const query = `
  SELECT 
    symbol,
    name,
    address,
    chain,
    narrative,
    market_cap,
    liquidity,
    volume_24h,
    score,
    result,
    reason,
    lesson_ref,
    source,
    source_channels,
    scanned_at,
    updated_at
  FROM coins
  ORDER BY score DESC, updated_at DESC
`;

const result = execSync(`sqlite3 "${dbPath}" -json "${query.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
const coins = JSON.parse(result);

fs.writeFileSync(outputPath, JSON.stringify(coins, null, 2));

console.log(`✅ Exported ${coins.length} coins to scanner-coins.json`);
