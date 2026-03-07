import https from 'https';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const ACCOUNTS = [
  'cobie','GCRClassic','CryptoCapo_','CredibleCrypto','ColdBloodShill','DaanCrypto','SmartContracter','CryptoKaleo','AltcoinSherpa','CryptoGodJohn',
  'blknoiz06','zachxbt','TheMoonCarl','gainzy222','Trader_XO','CryptoTony__','GiganticRebirth','MoonOverlord','Elliotrades','KoroushAK',
  'LomahCrypto','ErgoBTC','100trillionUSD','APompliano','scottmelker','CryptoCapital_V','Crypto_Birb','PeterLBrandt','CryptoMaestro_','cryptomanran',
  'MessariCrypto','nansen_ai','DefiLlama','whale_alert','santimentfeed','glassnode','IntoTheBlock','MilesDeutscher','RaoulGMI','balajis',
  'VitalikButerin','Rewkang','BarrySilbert','CathieDWood','cburniske','ErikVoorhees','aantonop','adam3us','laurashin','CamiRusso',
  'Zeneca_33','punk6529','brian_armstrong','SOLBigBrain','SolanaLegend','ansem','JasonYanowitz','TaschaLabs','CryptoDiffer','CryptoRank_io',
  'RunnerXBT','IvanOnTech','boxmining','ai16zdao','shawmakesmagic','jimfan','0xSisyphus','DeFi_Dad','Tetranode','andrecronje',
  'LayerZero_Labs','CelestiaOrg','willclemente','CroissantEth','AutismCapital','0xHamz','mrjasonchoi','hasufl','FrankResearcher','0xngmi',
  'DonAlt','Bankless','DeFianceCapital','a16zcrypto','EmperorBTC','nebraskangooner','CryptoWendyO','sassal0x','DocumentingBTC','saylor',
  'davincij15','GarethSoloway','KaitoAI','virtuals_io','blocktrainer','btcecho','JulianHosp','HossDE','Blockmagazin','InvestmentPunk',
  'roman_reher','finanzfluss','marc_friedrich','MMCrypto','KryptoKumpel','CriptoNoticias','CriptoDinero','Matidroid','JuanEnCripto','Criptomonedas_',
  'CryptoSpanish','Cripto247','CriptoTendencia',
  'elonmusk','cz_binance','paradigm','coindesk','cointelegraph','bitcoinmagazine','watcherguru','polymarket','ericbalchunas','cdixon',
  'ryansadams','trustlessstate','johnedeaton1','peterschiff','drakefjustin','tier10k','xcopyart','geiger_capital','marionawfal',
  'lookonchain','EmberCN','ai_9684xtpa','0xJeff_','MustStopMurad','DefiIgnas','Pentosh1','CryptoHayes','inversebrah','Route2FI',
  'CryptoCred','WuBlockchain','db_defi','TheDeFiEdge'
];

const RESULTS_FILE = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-raw.json';

function snowflakeToDate(id) {
  const timestamp = Number(BigInt(id) >> 22n) + 1288834974657;
  return new Date(timestamp);
}

function fetchAccount(handle) {
  return new Promise((resolve) => {
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (data.includes('Rate limit')) {
          resolve({ handle, status: 'RATELIMIT' });
          return;
        }
        
        // Extract ALL tweet IDs
        const tweetIds = [];
        const re = /entry_id":"tweet-(\d+)"/g;
        let m;
        while ((m = re.exec(data)) !== null) {
          tweetIds.push(m[1]);
        }
        
        if (tweetIds.length === 0) {
          if (data.includes('"hasResults":false')) {
            resolve({ handle, status: 'NO_RESULTS' });
          } else if (data.length < 500) {
            resolve({ handle, status: 'NODATA' });
          } else {
            resolve({ handle, status: 'NODATE' });
          }
          return;
        }
        
        // Find the MAX tweet ID (most recent)
        const maxId = tweetIds.reduce((a, b) => BigInt(a) > BigInt(b) ? a : b);
        const maxDate = snowflakeToDate(maxId);
        
        // Also get statuses_count if available
        const scMatch = data.match(/"statuses_count":(\d+)/);
        const fcMatch = data.match(/"followers_count":(\d+)/);
        
        resolve({
          handle,
          status: 'OK',
          maxTweetId: maxId,
          latestDate: maxDate.toISOString(),
          tweetCount: tweetIds.length,
          statusesCount: scMatch ? parseInt(scMatch[1]) : null,
          followersCount: fcMatch ? parseInt(fcMatch[1]) : null,
        });
      });
    });
    req.on('error', (e) => resolve({ handle, status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ handle, status: 'TIMEOUT' }); });
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Load existing results
  let results = [];
  const done = new Set();
  if (existsSync(RESULTS_FILE)) {
    try {
      results = JSON.parse(readFileSync(RESULTS_FILE));
      for (const r of results) {
        if (r.status === 'OK' || r.status === 'NO_RESULTS') done.add(r.handle);
      }
      // Remove RATELIMIT entries for retry
      results = results.filter(r => r.status !== 'RATELIMIT');
    } catch(e) {}
  }
  
  const todo = ACCOUNTS.filter(h => !done.has(h));
  console.log(`Already done: ${done.size}, Todo: ${todo.length}`);
  
  for (let i = 0; i < todo.length; i++) {
    const handle = todo[i];
    console.log(`[${i+1}/${todo.length}] ${handle}...`);
    
    const result = await fetchAccount(handle);
    results.push(result);
    
    if (result.status === 'OK') {
      console.log(`  ✅ ${result.latestDate.substring(0,10)} (${result.tweetCount} tweets, ${result.followersCount} followers)`);
    } else if (result.status === 'RATELIMIT') {
      console.log(`  ⏳ Rate limited, waiting 90s...`);
      // Save progress
      writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      await sleep(90000);
      // Retry this one
      i--;
      results.pop(); // Remove the RATELIMIT entry
      continue;
    } else {
      console.log(`  ❌ ${result.status}`);
    }
    
    await sleep(8000); // 8s between requests
  }
  
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  
  // Summary
  const ok = results.filter(r => r.status === 'OK');
  const noResults = results.filter(r => r.status === 'NO_RESULTS');
  const other = results.filter(r => r.status !== 'OK' && r.status !== 'NO_RESULTS');
  console.log(`\n=== SUMMARY ===`);
  console.log(`OK: ${ok.length}, NO_RESULTS: ${noResults.length}, OTHER: ${other.length}`);
  console.log(`Total: ${results.length}`);
}

main();
