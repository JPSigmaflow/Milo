import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1080, height: 800 });
await page.setContent(readFileSync('bilanz.html', 'utf-8'), { waitUntil: 'networkidle' });
await page.screenshot({ path: 'bilanz.png', fullPage: true });
await browser.close();
console.log('Done');
