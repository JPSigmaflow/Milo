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
const UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function snowflakeToDate(id) {
  const timestamp = Number(BigInt(id) >> 22n) + 1288834974657;
  return new Date(timestamp);
}

function fetchAccount(handle, uaIdx) {
  return new Promise((resolve) => {
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`;
    const req = https.get(url, {
      headers: { 'User-Agent': UAS[uaIdx % UAS.length] },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (data.includes('Rate limit')) return resolve({ handle, status: 'RATELIMIT' });
        const ids = [...data.matchAll(/entry_id":"tweet-(\d+)"/g)].map(m => m[1]);
        if (!ids.length) {
          if (data.includes('"entries":[]') || data.includes('"hasResults":false'))
            return resolve({ handle, status: 'NO_RESULTS' });
          return resolve({ handle, status: data.length < 500 ? 'NODATA' : 'NODATE' });
        }
        const maxId = ids.reduce((a,b) => BigInt(a) > BigInt(b) ? a : b);
        const sc = data.match(/"statuses_count":(\d+)/);
        const fc = data.match(/"followers_count":(\d+)/);
        resolve({
          handle, status: 'OK',
          latestDate: snowflakeToDate(maxId).toISOString(),
          tweetsSeen: ids.length,
          statusesCount: sc ? +sc[1] : null,
          followersCount: fc ? +fc[1] : null,
        });
      });
    });
    req.on('error', e => resolve({ handle, status: 'ERROR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ handle, status: 'TIMEOUT' }); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  let results = [];
  const done = new Set();
  if (existsSync(RESULTS_FILE)) {
    try {
      results = JSON.parse(readFileSync(RESULTS_FILE));
      for (const r of results) if (r.status === 'OK' || r.status === 'NO_RESULTS') done.add(r.handle);
      results = results.filter(r => done.has(r.handle));
    } catch(e) {}
  }

  const todo = ACCOUNTS.filter(h => !done.has(h));
  console.log(`Done: ${done.size}, Todo: ${todo.length}`);
  
  let consecutiveRL = 0;
  for (let i = 0; i < todo.length; i++) {
    const r = await fetchAccount(todo[i], i);
    if (r.status === 'RATELIMIT') {
      consecutiveRL++;
      const wait = Math.min(consecutiveRL * 60, 300); // escalating wait
      console.log(`[${i+1}] ${r.handle}: RL (wait ${wait}s, streak=${consecutiveRL})`);
      writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      await sleep(wait * 1000);
      i--; // retry
      continue;
    }
    consecutiveRL = 0;
    results.push(r);
    done.add(r.handle);
    const info = r.status === 'OK' ? `${r.latestDate.substring(0,10)} [${r.followersCount}]` : r.status;
    console.log(`[${i+1}/${todo.length}] ${r.handle}: ${info}`);
    await sleep(10000);
  }

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.status === 'OK').length;
  console.log(`\nDone! OK=${ok}, Total=${results.length}`);
}

main();
