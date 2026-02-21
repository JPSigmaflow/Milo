import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Top Crypto YouTube channels (RSS via channel ID)
const CHANNELS = [
  { name: 'Coin Bureau', id: 'UCqK_GSMbpiV8spgD3ZGloSw' },
  { name: 'BitBoy Crypto', id: 'UCjemQfjaXAzA-95RGoy1wCA' },
  { name: 'Altcoin Daily', id: 'UCbLhGKVY-bJPcawebgtNfbw' },
  { name: 'Crypto Banter', id: 'UCN9Nj4tjXbVTLYWN0EKly_Q' },
  { name: 'DataDash', id: 'UCCatR7nWbYrkVXdxXb4cGXg' },
  { name: 'The Moon', id: 'UCc4Rz_T9Sb1w5rqqo9pL1Og' },
  { name: 'Ivan on Tech', id: 'UCrYmtJBtLdtm2ov84ulV-yg' },
  { name: 'Crypto Jebb', id: 'UCviqt4gMPMo3sXlJMEynEmA' },
  { name: 'Miles Deutscher', id: 'UCgl7BVtNRE0RrWFExG3VoCg' },
  { name: 'Sheldon Evans', id: 'UCUpceKlTYRsfpkEGVqKb4lw' },
  { name: 'Alex Becker', id: 'UCKQvGU-qtjGS-txDP94yicA' },
  { name: 'Lark Davis', id: 'UCl2oCaw8hdR_kbqyqd2klIA' },
  { name: 'Crypto Casey', id: 'UCuiXpfHb84gVmyGDVPq1fJg' },
  { name: 'Benjamin Cowen', id: 'UCRvqjQPSeaWn-uEx-w0XOIg' },
  { name: 'CryptosRUs', id: 'UCkkgRMGSGf3HhiVzBkG5DCw' },
  { name: 'MoneyZG', id: 'UCWySmDfOQJEKiYoH-L6eRtg' },
  { name: 'Crypto World Josh', id: 'UCLnQ34ZBSjy2JQjeRudFEDw' },
  { name: 'DeFi Made Here', id: 'UCajN3rBsfKaMigK8sMPrNhg' },
  { name: 'Ansem', id: 'UC4jX8Uf09tW1Tgo_6CfqmKQ' },
  { name: 'SunCrypto', id: 'UCuLbCgXd1rwvS3JT47FFkQA' },
  { name: 'InvestAnswers', id: 'UClgJyzwGs-GyaNxUHcLZrkg' },
  { name: 'HossUndHopf', id: 'UCjyU6vepybsflOOlm9mDlbA' },
  { name: 'TheDefiEdge', id: 'UCY1uOTf-W8vXYhGG8tq-KfA' },
];

export async function scanYouTube() {
  const seenFile = join(ROOT, 'data', 'seen-yt.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { ids: [] };
  const seenSet = new Set(seen.ids);
  const results = [];

  for (const ch of CHANNELS) {
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`;
      const res = await fetch(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) continue;
      const xml = await res.text();
      
      // Parse entries
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
      let newCount = 0;
      for (const [, entry] of entries.slice(0, 3)) {
        const id = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
        const title = entry.match(/<title>(.*?)<\/title>/)?.[1];
        const published = entry.match(/<published>(.*?)<\/published>/)?.[1];
        
        if (!id || seenSet.has(id)) continue;
        
        // Only last 24h
        const age = Date.now() - new Date(published).getTime();
        if (age > 24 * 60 * 60 * 1000) continue;
        
        seenSet.add(id);
        newCount++;
        results.push({
          source: 'youtube',
          channel: ch.name,
          title,
          videoId: id,
          url: `https://youtube.com/watch?v=${id}`,
          time: published,
        });
      }
      if (newCount > 0) console.log(`[YT] ${ch.name}: ${newCount} new videos`);
    } catch(e) {}
  }

  seen.ids = [...seenSet].slice(-5000);
  writeFileSync(seenFile, JSON.stringify(seen));
  console.log(`[YT] Total: ${results.length} new videos from ${CHANNELS.length} channels`);
  return results;
}
