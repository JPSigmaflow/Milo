import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();

for (let i = 1; i <= 6; i++) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 800 });
  const html = readFileSync(`masterplan-card${i}.html`, 'utf-8');
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `mp-${i}.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log('Done');
