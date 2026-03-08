import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto('file:///Users/milo/.openclaw/workspace/shared/crypto-strategy/dashboard-portfolio.html');
await page.screenshot({ path: '/Users/milo/.openclaw/workspace/shared/crypto-strategy/portfolio-live.png', fullPage: true });
await browser.close();
console.log('Done');
