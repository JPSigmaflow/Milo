import { chromium } from 'playwright';

const STORAGE_PATH = './x-session.json';

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
});
const page = await ctx.newPage();
await page.goto('https://x.com/login');

console.log('Waiting for login... (60s timeout)');
// Wait until we see the home timeline (means login succeeded)
await page.waitForURL('**/home', { timeout: 120000 });
console.log('Login successful! Saving session...');

await ctx.storageState({ path: STORAGE_PATH });
console.log('Session saved to', STORAGE_PATH);

await browser.close();
