import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto('file:///Users/milo/.openclaw/workspace/shared/crypto-strategy/dashboard-screenshot.html');
await page.screenshot({ path: '/Users/milo/.openclaw/workspace/shared/crypto-strategy/portfolio-screenshot.png', fullPage: true });
await browser.close();
console.log('Done');
