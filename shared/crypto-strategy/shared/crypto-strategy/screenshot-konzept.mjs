import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
await page.goto('file:///Users/milo/.openclaw/workspace/shared/crypto-strategy/konzept-visual.html');
await page.screenshot({ path: '/Users/milo/.openclaw/workspace/shared/crypto-strategy/konzept-screenshot.png', fullPage: true });
await browser.close();
console.log('Done');
