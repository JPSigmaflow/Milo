// Parse syndication data fetched via different method
// This script processes pre-fetched HTML files or uses a different approach

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';

const ACCOUNTS_META = JSON.parse(readFileSync('/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-expansion.json'));
const NETWORK_MAP = JSON.parse(readFileSync('/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-network-map.json'));

// Build metadata lookup
const meta = {};
for (const a of ACCOUNTS_META.x_verified) {
  meta[a.handle.toLowerCase()] = { followers: a.followers_approx, category: a.category, lang: a.lang };
}

// Missing accounts from network map - add basic meta
const missingMeta = {
  elonmusk: { followers: "200M+", category: "tech/influence" },
  cz_binance: { followers: "8M", category: "exchange founder" },
  paradigm: { followers: "200K", category: "VC" },
  coindesk: { followers: "2M", category: "media" },
  cointelegraph: { followers: "2M", category: "media" },
  bitcoinmagazine: { followers: "1M", category: "media" },
  watcherguru: { followers: "500K", category: "news" },
  polymarket: { followers: "300K", category: "prediction market" },
  ericbalchunas: { followers: "300K", category: "ETF analyst" },
  cdixon: { followers: "500K", category: "VC/a16z" },
  ryansadams: { followers: "250K", category: "DeFi/Bankless" },
  trustlessstate: { followers: "150K", category: "DeFi/Bankless" },
  johnedeaton1: { followers: "300K", category: "crypto lawyer" },
  peterschiff: { followers: "1M", category: "gold bug/critic" },
  drakefjustin: { followers: "100K", category: "Ethereum researcher" },
  tier10k: { followers: "200K", category: "news/data" },
  xcopyart: { followers: "200K", category: "NFT artist" },
  geiger_capital: { followers: "100K", category: "macro" },
  marionawfal: { followers: "500K", category: "news/podcast" },
};

const configAccounts = {
  lookonchain: { followers: "500K", category: "on-chain analytics" },
  EmberCN: { followers: "200K", category: "on-chain analyst" },
  ai_9684xtpa: { followers: "200K", category: "on-chain analyst" },
  "0xJeff_": { followers: "100K", category: "DeFi/AI" },
  MustStopMurad: { followers: "200K", category: "memecoin analyst" },
  DefiIgnas: { followers: "200K", category: "DeFi researcher" },
  Pentosh1: { followers: "300K", category: "trader" },
  CryptoHayes: { followers: "500K", category: "fund manager/BitMEX" },
  inversebrah: { followers: "100K", category: "DeFi/memes" },
  Route2FI: { followers: "200K", category: "DeFi educator" },
  CryptoCred: { followers: "200K", category: "trader/educator" },
  WuBlockchain: { followers: "300K", category: "journalist/China" },
  db_defi: { followers: "100K", category: "DeFi analyst" },
  TheDeFiEdge: { followers: "200K", category: "DeFi educator" },
};

for (const [h, m] of Object.entries(missingMeta)) meta[h.toLowerCase()] = m;
for (const [h, m] of Object.entries(configAccounts)) meta[h.toLowerCase()] = m;

// Build cluster lookup
const clusterLookup = {};
for (const c of NETWORK_MAP.clusters) {
  for (const member of c.members) {
    clusterLookup[member.toLowerCase()] = c.name;
  }
}

// Output what we have
const output = { meta, clusterLookup };
writeFileSync('/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-meta.json', JSON.stringify(output, null, 2));
console.log('Meta written. Accounts:', Object.keys(meta).length, 'Clusters:', Object.keys(clusterLookup).length);
