import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
const html = readFileSync('masterplan-mobile.html', 'utf-8');
await page.setViewportSize({ width: 1080, height: 1920 });
await page.setContent(html, { waitUntil: 'networkidle' });

await page.pdf({
  path: 'MASTERPLAN-v3-final.pdf',
  width: '1080px',
  printBackground: true,
  margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
});

await browser.close();
console.log('Done');
