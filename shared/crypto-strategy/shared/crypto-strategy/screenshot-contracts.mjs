import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1080, height: 800 });
await page.setContent(readFileSync('portfolio-contracts.html', 'utf-8'), { waitUntil: 'networkidle' });
await page.screenshot({ path: 'portfolio-contracts.png', fullPage: true });
await browser.close();
console.log('Done');
