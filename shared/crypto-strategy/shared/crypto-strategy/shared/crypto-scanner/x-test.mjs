import { chromium } from 'playwright';

const AUTH = "9a90162cad8ecbe888dc05d97af9fc40c5fbe1bf";
const CT0 = "f17ab672a1e8016cbaca3c2a92b401166fefd61673940cee886678b5c386b481dfedba1be2ef49d34b09c33c0502489d9a403b9f1f7b4aa0bd1de24552c6b9e34a3258e3e09bd3162aeaa5c97a7d2052";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
});

// Set cookies
await ctx.addCookies([
  { name: 'auth_token', value: AUTH, domain: '.x.com', path: '/', httpOnly: true, secure: true },
  { name: 'ct0', value: CT0, domain: '.x.com', path: '/', secure: true },
]);

const page = await ctx.newPage();
await page.goto('https://x.com/search?q=solana%20memecoin&src=typed_query&f=live', { waitUntil: 'networkidle', timeout: 20000 });

// Wait a moment for tweets to load
await page.waitForTimeout(3000);

const tweets = await page.evaluate(() => {
  const els = document.querySelectorAll('[data-testid="tweetText"]');
  return Array.from(els).slice(0, 5).map(el => el.innerText);
});

console.log(`Found ${tweets.length} tweets`);
tweets.forEach((t, i) => console.log(`${i+1}. ${t.substring(0, 150)}`));

await browser.close();
