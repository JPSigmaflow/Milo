import https from 'https';
import { writeFileSync, readFileSync } from 'fs';

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
        'Accept': 'text/html',
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (data.includes('Rate limit')) {
          resolve({ handle, status: 'RATELIMIT' });
          return;
        }
        // Extract first tweet entry_id
        const match = data.match(/entry_id":"tweet-(\d+)"/);
        if (match) {
          const tweetId = match[1];
          const date = snowflakeToDate(tweetId);
          // Also try to get created_at
          const catMatch = data.match(/"created_at":"([^"]+)"/);
          resolve({
            handle,
            status: 'OK',
            tweetId,
            date: date.toISOString(),
            created_at: catMatch ? catMatch[1] : null
          });
        } else if (data.includes('hasResults":false') || data.includes('"hasResults":false')) {
          resolve({ handle, status: 'NO_RESULTS' });
        } else if (data.length < 500) {
          resolve({ handle, status: 'NODATA', len: data.length });
        } else {
          resolve({ handle, status: 'NODATE', len: data.length });
        }
      });
    });
    req.on('error', (e) => resolve({ handle, status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ handle, status: 'TIMEOUT' }); });
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const results = [];
  const BATCH = 3;
  const DELAY = 5000; // 5s between batches

  for (let i = 0; i < ACCOUNTS.length; i += BATCH) {
    const batch = ACCOUNTS.slice(i, i + BATCH);
    console.log(`Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(ACCOUNTS.length/BATCH)}: ${batch.join(', ')}`);
    
    const batchResults = await Promise.all(batch.map(h => fetchAccount(h)));
    
    let hitRateLimit = false;
    for (const r of batchResults) {
      results.push(r);
      console.log(`  ${r.handle}: ${r.status}${r.date ? ' → ' + r.date.substring(0,10) : ''}`);
      if (r.status === 'RATELIMIT') hitRateLimit = true;
    }
    
    if (hitRateLimit) {
      console.log('  Rate limited! Waiting 60s...');
      await sleep(60000);
    } else {
      await sleep(DELAY);
    }
  }

  writeFileSync('/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-raw.json', JSON.stringify(results, null, 2));
  console.log(`\nDone! ${results.length} accounts processed.`);
  
  const ok = results.filter(r => r.status === 'OK').length;
  const rl = results.filter(r => r.status === 'RATELIMIT').length;
  const other = results.length - ok - rl;
  console.log(`OK: ${ok}, RATELIMIT: ${rl}, OTHER: ${other}`);
}

main();
