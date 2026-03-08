import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const coins = ['clanker','cfg','zama','fhe','sapien'];
const browser = await chromium.launch();
for (const c of coins) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 800 });
  await page.setContent(readFileSync(`coin-${c}.html`, 'utf-8'), { waitUntil: 'networkidle' });
  await page.screenshot({ path: `coin-${c}.png`, fullPage: true });
  await page.close();
}
await browser.close();
console.log('Done');
