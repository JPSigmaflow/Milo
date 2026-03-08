import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export async function scanCryptoPanic() {
  const seenFile = join(ROOT, 'data', 'seen-cp.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { ids: [] };
  const seenSet = new Set(seen.ids);
  const results = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://cryptopanic.com/', { timeout: 12000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const posts = await page.evaluate(() => {
      const items = document.querySelectorAll('.news-row, .news-cell, [class*="news"]');
      return Array.from(items).slice(0, 30).map(el => {
        const link = el.querySelector('a');
        return {
          title: link?.textContent?.trim() || el.textContent?.trim().substring(0, 200),
          url: link?.href || '',
        };
      }).filter(p => p.title && p.title.length > 20);
    });

    for (const p of posts) {
      const id = p.title.substring(0, 60);
      if (seenSet.has(id)) continue;
      seenSet.add(id);
      results.push({ source: 'cryptopanic', ...p, time: new Date().toISOString() });
    }
    console.log(`[CP] ${posts.length} posts, ${results.length} new`);
  } catch(e) {
    console.log(`[CP] Error: ${e.message?.substring(0, 60)}`);
  }

  await browser.close();
  seen.ids = [...seenSet].slice(-5000);
  writeFileSync(seenFile, JSON.stringify(seen));
  return results;
}
