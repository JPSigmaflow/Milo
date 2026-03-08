import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export async function scanPumpFun() {
  const seenFile = join(ROOT, 'data', 'seen-pump.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { ids: [] };
  const seenSet = new Set(seen.ids);
  const results = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Intercept API responses
    const apiData = [];
    page.on('response', async (response) => {
      if (response.url().includes('/coins') && response.status() === 200) {
        try {
          const json = await response.json();
          if (Array.isArray(json)) apiData.push(...json);
        } catch {}
      }
    });

    await page.goto('https://pump.fun/board', { timeout: 15000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Try scraping the page directly
    const coins = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="coin"], [class*="token"], a[href*="/coin/"]');
      return Array.from(cards).slice(0, 20).map(el => ({
        name: el.textContent?.substring(0, 100)?.trim(),
        href: el.href || el.querySelector('a')?.href || '',
      })).filter(c => c.name && c.name.length > 2);
    });

    // Use intercepted API data if available
    const source = apiData.length > 0 ? apiData : coins;
    for (const c of source) {
      const id = c.mint || c.href || c.name?.substring(0, 40);
      if (!id || seenSet.has(id)) continue;
      seenSet.add(id);
      // Only save tokens with MC > $500K (filter micro-spam)
      const mc = c.usd_market_cap || 0;
      if (mc < 500000) continue;
      
      results.push({
        source: 'pumpfun',
        name: c.name || c.symbol,
        symbol: c.symbol,
        contract: c.mint,
        marketCap: mc,
        time: new Date().toISOString(),
      });
    }
    console.log(`[Pump] Found ${source.length} tokens, ${results.length} new`);
  } catch(e) {
    console.log(`[Pump] Error: ${e.message?.substring(0, 60)}`);
  }

  await browser.close();
  seen.ids = [...seenSet].slice(-10000);
  writeFileSync(seenFile, JSON.stringify(seen));
  return results;
}
